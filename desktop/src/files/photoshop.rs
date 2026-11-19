use super::artwork::{append_artwork_page, MAX_ARTWORK_OUTPUT_BYTES, MAX_ARTWORK_SIDE};
use crate::network::browser::policy::require_editor;
use objc2_core_foundation::{
    CFBoolean, CFData, CFDictionary, CFMutableData, CFNumber, CFRetained, CFString, CFType,
};
use objc2_core_graphics::CGImage;
use objc2_image_io::{
    kCGImageSourceCreateThumbnailFromImageAlways, kCGImageSourceThumbnailMaxPixelSize,
    CGImageDestination, CGImageSource, CGImageSourceStatus,
};
use tauri::ipc::{InvokeBody, Request, Response};

const MAX_PHOTOSHOP_BYTES: usize = 32 * 1024 * 1024;
const MAX_DECODED_BYTES: u64 = 128 * 1024 * 1024;
const MAX_SOURCE_PIXELS: u64 = 24_000_000;
const MAX_SOURCE_SIDE: u32 = 100_000;
static PHOTOSHOP_RENDERER: tokio::sync::Semaphore = tokio::sync::Semaphore::const_new(1);

#[tauri::command]
pub async fn render_photoshop_image(
    webview: tauri::Webview,
    request: Request<'_>,
) -> Result<Response, String> {
    require_editor(webview.label())?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Photoshop import requires binary data.".into());
    };
    if bytes.len() > MAX_PHOTOSHOP_BYTES {
        return Err("Photoshop import files must be 32 MB or smaller.".into());
    }
    let lease = PHOTOSHOP_RENDERER
        .try_acquire()
        .map_err(|_| "Another Photoshop file is opening. Try again when it finishes.")?;
    let data = bytes.clone();
    let output = tauri::async_runtime::spawn_blocking(move || {
        let _lease = lease;
        render_photoshop(&data)
    })
    .await
    .map_err(|_| "Photoshop rendering stopped unexpectedly.")??;
    Ok(Response::new(output))
}

fn photoshop_size(bytes: &[u8]) -> Result<(u32, u32), String> {
    if bytes.len() < 26 || !bytes.starts_with(b"8BPS") || !matches!(bytes[4..6], [0, 1 | 2]) {
        return Err("The file is not a supported Photoshop PSD or PSB document.".into());
    }
    let channels = u16::from_be_bytes([bytes[12], bytes[13]]);
    let height = u32::from_be_bytes([bytes[14], bytes[15], bytes[16], bytes[17]]);
    let width = u32::from_be_bytes([bytes[18], bytes[19], bytes[20], bytes[21]]);
    let depth = u16::from_be_bytes([bytes[22], bytes[23]]);
    let pixels = u64::from(width) * u64::from(height);
    if !(1..=56).contains(&channels) || !matches!(depth, 1 | 8 | 16 | 32) {
        return Err("The Photoshop channel layout is unsupported.".into());
    }
    if pixels == 0
        || pixels > MAX_SOURCE_PIXELS
        || width.max(height) > MAX_SOURCE_SIDE
        || pixels * u64::from(channels) * u64::from(depth.div_ceil(8)) > MAX_DECODED_BYTES
    {
        return Err("The Photoshop image exceeds the decoded size limit.".into());
    }
    Ok((width, height))
}

fn decode_composite(bytes: &[u8]) -> Result<CFRetained<CGImage>, String> {
    let data = CFData::from_bytes(bytes);
    // The dictionary contains the two Image I/O keys and their documented Boolean and number values.
    let image = unsafe {
        let source = CGImageSource::with_data(&data, None)
            .ok_or("Could not read the Photoshop document.")?;
        let side = CFNumber::new_i32(MAX_ARTWORK_SIDE);
        let keys = [
            kCGImageSourceCreateThumbnailFromImageAlways,
            kCGImageSourceThumbnailMaxPixelSize,
        ];
        let values: [&CFType; 2] = [CFBoolean::new(true), &*side];
        let options = CFDictionary::from_slices(&keys, &values);
        let thumbnail = source
            .thumbnail_at_index(0, Some(options.as_opaque()))
            .ok_or("No readable Photoshop composite. Save with Maximize Compatibility enabled.")?;
        if source.status_at_index(0) != CGImageSourceStatus::StatusComplete {
            return Err("The Photoshop composite is incomplete.".into());
        }
        thumbnail
    };
    let side = CGImage::width(Some(&image)).max(CGImage::height(Some(&image)));
    if side > MAX_ARTWORK_SIDE as usize {
        return Err("The Photoshop preview exceeds the bitmap size limit.".into());
    }
    Ok(image)
}

fn encode_composite(image: &CGImage) -> Result<Vec<u8>, String> {
    // PNG destination owns its mutable output until encoding completes.
    let data = unsafe {
        let data =
            CFMutableData::new(None, 0).ok_or("Could not allocate the Photoshop preview.")?;
        let png_type = CFString::from_str("public.png");
        let destination = CGImageDestination::with_data(&data, &png_type, 1, None)
            .ok_or("Could not create a Photoshop preview.")?;
        destination.add_image(image, None);
        if !destination.finalize() || data.len() > MAX_ARTWORK_OUTPUT_BYTES - 24 {
            return Err("Could not encode the Photoshop composite preview.".into());
        }
        data
    };
    Ok(data.to_vec())
}

fn render_photoshop(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let (width, height) = photoshop_size(bytes)?;
    let image = decode_composite(bytes)?;
    let png = encode_composite(&image)?;
    let mut output = 1u32.to_le_bytes().to_vec();
    append_artwork_page(&mut output, f64::from(width), f64::from(height), &png);
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn header(version: u16, width: u32, height: u32) -> Vec<u8> {
        let mut data = b"8BPS".to_vec();
        data.extend_from_slice(&version.to_be_bytes());
        data.extend_from_slice(&[0; 6]);
        data.extend_from_slice(&3u16.to_be_bytes());
        data.extend_from_slice(&height.to_be_bytes());
        data.extend_from_slice(&width.to_be_bytes());
        data.extend_from_slice(&8u16.to_be_bytes());
        data.extend_from_slice(&3u16.to_be_bytes());
        data
    }

    fn two_pixel_composite(version: u16) -> Vec<u8> {
        let mut data = header(version, 2, 1);
        // No color-mode data, image resources or layers. Raw planar RGB composite.
        data.extend_from_slice(&[0; 8]);
        if version == 2 {
            data.extend_from_slice(&[0; 8]);
        } else {
            data.extend_from_slice(&[0; 4]);
        }
        data.extend_from_slice(&[0, 0, 255, 0, 0, 255, 0, 0]);
        data
    }

    #[test]
    fn opens_psd_and_psb_composite_pixels_at_original_canvas_size() {
        for version in [1, 2] {
            let packet = render_photoshop(&two_pixel_composite(version)).unwrap();
            assert_eq!(&packet[..4], &1u32.to_le_bytes());
            assert_eq!(&packet[4..12], &2f64.to_le_bytes());
            assert_eq!(&packet[12..20], &1f64.to_le_bytes());
            let png = image::load_from_memory_with_format(&packet[24..], image::ImageFormat::Png)
                .unwrap()
                .into_rgb8();
            assert_eq!(png.dimensions(), (2, 1));
            assert_eq!(png.into_raw(), [255, 0, 0, 0, 255, 0]);
        }
    }

    #[test]
    fn rejects_false_headers_large_images_and_missing_composites() {
        assert!(render_photoshop(b"not a Photoshop file")
            .unwrap_err()
            .contains("not a supported"));
        assert!(render_photoshop(&header(2, 50_000, 40_000))
            .unwrap_err()
            .contains("decoded size limit"));
        assert!(render_photoshop(&header(1, 2, 1)).is_err());
    }
}
