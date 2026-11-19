use super::artwork::{append_artwork_page, MAX_ARTWORK_OUTPUT_BYTES, MAX_ARTWORK_SIDE};
use crate::network::browser::policy::require_editor;
use image::{codecs::png::PngEncoder, ExtendedColorType, ImageEncoder};
use objc2_core_foundation::{CFData, CFRetained, CGPoint, CGRect, CGSize};
use objc2_core_graphics::{
    CGBitmapContextCreate, CGColorSpace, CGContext, CGDataProvider, CGImageAlphaInfo, CGPDFBox,
    CGPDFDocument, CGPDFPage,
};
use tauri::ipc::{InvokeBody, Request, Response};

const MAX_INPUT_BYTES: usize = 32 * 1024 * 1024;
const MAX_PAGES: usize = 32;
const MAX_RENDER_PIXELS: usize = 40_000_000;
const MAX_PAGE_SIDE: f64 = 100_000.0;
static PDF_RENDERER: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(1);

#[tauri::command]
pub async fn render_pdf_pages(
    webview: tauri::Webview,
    request: Request<'_>,
) -> Result<Response, String> {
    require_editor(webview.label())?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("PDF import requires binary data.".into());
    };
    if bytes.len() > MAX_INPUT_BYTES {
        return Err("PDF import files must be 32 MB or smaller.".into());
    }
    let lease = PDF_RENDERER
        .try_acquire()
        .map_err(|_| "Another PDF is opening. Try again when it finishes.")?;
    let input = bytes.clone();
    let output = tauri::async_runtime::spawn_blocking(move || {
        let _lease = lease;
        render_document(&input)
    })
    .await
    .map_err(|_| "PDF rendering stopped unexpectedly.")??;
    Ok(Response::new(output))
}

fn read_document(bytes: &[u8]) -> Result<CFRetained<CGPDFDocument>, String> {
    if !bytes.starts_with(b"%PDF-") {
        return Err("The file does not contain PDF artwork.".into());
    }
    let provider = CGDataProvider::with_cf_data(Some(&CFData::from_bytes(bytes)))
        .ok_or("Could not read the PDF data.")?;
    let pdf =
        CGPDFDocument::with_provider(Some(&provider)).ok_or("Could not read the PDF document.")?;
    if !CGPDFDocument::is_unlocked(Some(&pdf)) {
        return Err("The PDF is password protected.".into());
    }
    if CGPDFDocument::is_encrypted(Some(&pdf)) && !CGPDFDocument::allows_copying(Some(&pdf)) {
        return Err("The PDF restricts copying its artwork.".into());
    }
    Ok(pdf)
}

fn page_size(page: &CGPDFPage) -> Result<CGSize, String> {
    let box_size = CGPDFPage::box_rect(Some(page), CGPDFBox::CropBox).size;
    let rotation = CGPDFPage::rotation_angle(Some(page)).rem_euclid(360);
    let size = if rotation == 90 || rotation == 270 {
        CGSize::new(box_size.height, box_size.width)
    } else {
        box_size
    };
    if [size.width, size.height]
        .iter()
        .any(|value| !value.is_finite() || *value <= 0.0 || *value > MAX_PAGE_SIDE)
    {
        return Err("The PDF contains a page with unsupported dimensions.".into());
    }
    Ok(size)
}

fn render_page(
    page: &CGPDFPage,
    size: CGSize,
    width: usize,
    height: usize,
) -> Result<Vec<u8>, String> {
    let mut pixels = vec![0; width * height * 4];
    let color = CGColorSpace::new_device_rgb().ok_or("Could not allocate a PDF color space.")?;
    // Pixel storage remains live and unaliased until the drawing context has been released.
    let context = unsafe {
        CGBitmapContextCreate(
            pixels.as_mut_ptr().cast(),
            width,
            height,
            8,
            width * 4,
            Some(&color),
            CGImageAlphaInfo::NoneSkipLast.0,
        )
    }
    .ok_or("Could not allocate a PDF page bitmap.")?;
    let bounds = CGRect::new(
        CGPoint::new(0.0, 0.0),
        CGSize::new(width as f64, height as f64),
    );
    CGContext::set_rgb_fill_color(Some(&context), 1.0, 1.0, 1.0, 1.0);
    CGContext::fill_rect(Some(&context), bounds);
    CGContext::scale_ctm(
        Some(&context),
        width as f64 / size.width,
        height as f64 / size.height,
    );
    // Core Graphics can center a smaller page without enlarging it. Fit in page points
    // and apply bitmap resolution through the graphics context independently.
    let target = CGRect::new(CGPoint::new(0.0, 0.0), size);
    let transform = CGPDFPage::drawing_transform(Some(page), CGPDFBox::CropBox, target, 0, true);
    CGContext::concat_ctm(Some(&context), transform);
    CGContext::draw_pdf_page(Some(&context), Some(page));
    drop(context);
    let rgb: Vec<u8> = pixels
        .chunks_exact(4)
        .flat_map(|rgba| rgba[..3].iter().copied())
        .collect();
    let mut png = Vec::new();
    PngEncoder::new(&mut png)
        .write_image(&rgb, width as u32, height as u32, ExtendedColorType::Rgb8)
        .map_err(|_| "Could not encode a PDF page image.")?;
    Ok(png)
}

fn render_document(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let pdf = read_document(bytes)?;
    let count = CGPDFDocument::number_of_pages(Some(&pdf));
    if !(1..=MAX_PAGES).contains(&count) {
        return Err("PDF import supports documents with 1 to 32 pages.".into());
    }
    // Binary reply: page count, followed by width and height in points, PNG length and PNG bytes.
    let mut result = (count as u32).to_le_bytes().to_vec();
    let mut total_pixels = 0;
    for number in 1..=count {
        let page = CGPDFDocument::page(Some(&pdf), number).ok_or("Could not read a PDF page.")?;
        let size = page_size(&page)?;
        let scale = (f64::from(MAX_ARTWORK_SIDE) / size.width.max(size.height)).min(2.0);
        let width = (size.width * scale).ceil().min(f64::from(MAX_ARTWORK_SIDE)) as usize;
        let height = (size.height * scale)
            .ceil()
            .min(f64::from(MAX_ARTWORK_SIDE)) as usize;
        total_pixels += width * height;
        if total_pixels > MAX_RENDER_PIXELS {
            return Err("The PDF exceeds the total page image size limit.".into());
        }
        let png = render_page(&page, size, width, height)?;
        if result.len() + 20 + png.len() > MAX_ARTWORK_OUTPUT_BYTES {
            return Err("The PDF exceeds the total preview size limit.".into());
        }
        append_artwork_page(&mut result, size.width, size.height, &png);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &[u8] = include_bytes!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../tests/fixtures/pdf/open-pen-page-artwork.pdf"
    ));

    fn unpack_page(bytes: &[u8]) -> (f64, f64, image::RgbImage, &[u8]) {
        let width = f64::from_le_bytes(bytes[..8].try_into().unwrap());
        let height = f64::from_le_bytes(bytes[8..16].try_into().unwrap());
        let end = 20 + u32::from_le_bytes(bytes[16..20].try_into().unwrap()) as usize;
        let png = image::load_from_memory_with_format(&bytes[20..end], image::ImageFormat::Png)
            .unwrap()
            .into_rgb8();
        (width, height, png, &bytes[end..])
    }

    #[test]
    fn draws_ordered_pages_at_their_visible_size_and_orientation() {
        let encoded = render_document(FIXTURE).unwrap();
        assert_eq!(&encoded[..4], &2u32.to_le_bytes());
        let (width, height, first, next) = unpack_page(&encoded[4..]);
        assert_eq!(
            (width, height, first.dimensions()),
            (160.0, 100.0, (320, 200))
        );
        assert_eq!(first.get_pixel(160, 20).0, [255, 0, 0]);
        assert_eq!(first.get_pixel(160, 90).0, [255, 255, 255]);
        assert_eq!(first.get_pixel(160, 180).0, [0, 0, 255]);
        let (width, height, second, end) = unpack_page(next);
        assert_eq!(
            (width, height, second.dimensions()),
            (120.0, 220.0, (240, 440))
        );
        assert!(second.get_pixel(20, 20).0[1] > 180);
        assert!(end.is_empty());
    }

    #[test]
    fn rejects_files_without_pdf_artwork() {
        assert!(render_document(b"%!PS-Adobe Illustrator")
            .unwrap_err()
            .contains("does not contain PDF"));
        assert!(render_document(b"%PDF-1.7\ntruncated")
            .unwrap_err()
            .contains("Could not read"));
    }
}
