use crate::network::browser::policy::require_editor;
use image::{codecs::webp::WebPEncoder, ImageEncoder, ImageFormat, ImageReader, Limits};
use std::io::Cursor;

const MAX_PNG_BYTES: usize = 64 * 1024 * 1024;
const MAX_RGBA_BYTES: u64 = 256 * 1024 * 1024;
const WEBP_MAX_DIMENSION: u32 = 16383;

fn png_to_webp(png: &[u8]) -> Result<Vec<u8>, String> {
    if png.len() > MAX_PNG_BYTES {
        return Err("Image is too large for WebP export.".into());
    }
    let (width, height) = ImageReader::with_format(Cursor::new(png), ImageFormat::Png)
        .into_dimensions()
        .map_err(|_| "Could not read the export image.".to_string())?;
    if width == 0
        || height == 0
        || width > WEBP_MAX_DIMENSION
        || height > WEBP_MAX_DIMENSION
        || u64::from(width) * u64::from(height) * 4 > MAX_RGBA_BYTES
    {
        return Err("Image dimensions exceed the WebP export limit.".into());
    }
    let mut reader = ImageReader::with_format(Cursor::new(png), ImageFormat::Png);
    let mut limits = Limits::default();
    limits.max_image_width = Some(WEBP_MAX_DIMENSION);
    limits.max_image_height = Some(WEBP_MAX_DIMENSION);
    limits.max_alloc = Some(MAX_RGBA_BYTES);
    reader.limits(limits);
    let rgba = reader
        .decode()
        .map_err(|_| "Could not decode the export image.".to_string())?
        .into_rgba8();
    let mut output = Vec::new();
    // Native WebKit lacks a WebP encoder; the fallback preserves exported RGBA pixels losslessly.
    WebPEncoder::new_lossless(&mut output)
        .write_image(&rgba, width, height, image::ExtendedColorType::Rgba8)
        .map_err(|_| "Could not encode WebP.".to_string())?;
    Ok(output)
}

#[tauri::command]
pub async fn encode_webp(
    webview: tauri::Webview,
    png: Vec<u8>,
) -> Result<tauri::ipc::Response, String> {
    require_editor(webview.label())?;
    let output = tauri::async_runtime::spawn_blocking(move || png_to_webp(&png))
        .await
        .map_err(|_| "WebP encoding stopped unexpectedly.".to_string())??;
    Ok(tauri::ipc::Response::new(output))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::codecs::png::PngEncoder;

    #[test]
    fn native_webp_preserves_rgba_and_dimensions() {
        let pixels = [120, 30, 200, 128, 11, 220, 50, 255];
        let mut png = Vec::new();
        PngEncoder::new(&mut png)
            .write_image(&pixels, 2, 1, image::ExtendedColorType::Rgba8)
            .unwrap();
        let bytes = png_to_webp(&png).unwrap();
        assert_eq!(&bytes[..4], b"RIFF");
        assert_eq!(&bytes[8..12], b"WEBP");
        let decoded = image::load_from_memory_with_format(&bytes, ImageFormat::WebP)
            .unwrap()
            .into_rgba8();
        assert_eq!(decoded.dimensions(), (2, 1));
        assert_eq!(decoded.as_raw(), &pixels);
    }

    #[test]
    fn native_webp_refuses_invalid_input() {
        assert!(png_to_webp(b"not a PNG").is_err());
    }

    #[test]
    fn native_webp_refuses_a_valid_png_wider_than_webp_allows() {
        let width = WEBP_MAX_DIMENSION + 1;
        let pixels = vec![0; width as usize * 4];
        let mut png = Vec::new();
        PngEncoder::new(&mut png)
            .write_image(&pixels, width, 1, image::ExtendedColorType::Rgba8)
            .unwrap();
        assert!(png_to_webp(&png).unwrap_err().contains("dimensions"));
    }
}
