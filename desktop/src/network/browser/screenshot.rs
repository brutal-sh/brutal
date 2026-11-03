use super::{capture, extract, page_url, picker, policy::MAX_CAPTURE_BYTES};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

const SCRIPT: &str = include_str!("screenshot.js");
const MAX_PIXELS: u64 = 64_000_000;
static CAPTURING: AtomicBool = AtomicBool::new(false);
struct Lease;
impl Drop for Lease {
    fn drop(&mut self) {
        CAPTURING.store(false, Ordering::SeqCst);
    }
}

#[derive(Clone, Copy, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    Visible,
    Full,
    Selected,
}

#[derive(Clone, Copy, serde::Deserialize, serde::Serialize)]
#[serde(deny_unknown_fields)]
struct Rect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct Page {
    url: String,
    title: String,
    r#box: Rect,
    viewport_width: f64,
    viewport_height: f64,
    x: f64,
    y: f64,
}

impl Page {
    fn validate(&self) -> Result<(), String> {
        let rect = self.r#box;
        if [
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            self.viewport_width,
            self.viewport_height,
            self.x,
            self.y,
        ]
        .iter()
        .any(|value| !value.is_finite())
            || rect.x < 0.0
            || rect.y < 0.0
            || rect.width < 1.0
            || rect.height < 1.0
            || rect.width > 16384.0
            || rect.height > 65536.0
            || self.viewport_width < 1.0
            || self.viewport_height < 1.0
        {
            return Err("The page exceeds the screenshot dimension limit.".into());
        }
        Ok(())
    }

    fn validate_pixels(&self, scale: f64) -> Result<(), String> {
        if !scale.is_finite()
            || !(0.1..=16.0).contains(&scale)
            || self.r#box.width * self.r#box.height * scale.powi(2) > MAX_PIXELS as f64
        {
            Err("The page exceeds the screenshot pixel limit.".into())
        } else {
            Ok(())
        }
    }
}

async fn command(
    view: &tauri::Webview,
    id: &str,
    action: &str,
    extra: serde_json::Value,
) -> Result<Page, String> {
    let value = evaluate(view, id, action, extra).await?;
    let page: Page = serde_json::from_value(value)
        .map_err(|_| "The browser returned invalid screenshot dimensions.")?;
    page.validate()?;
    Ok(page)
}

async fn evaluate(
    view: &tauri::Webview,
    id: &str,
    action: &str,
    extra: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let mut argument = serde_json::json!({ "requestId": id, "action": action });
    if let (Some(target), Some(extra)) = (argument.as_object_mut(), extra.as_object()) {
        target.extend(extra.clone());
    }
    extract::evaluate(view, format!("({SCRIPT})({argument})"), id).await
}

async fn unchanged(
    view: &tauri::Webview,
    url: &url::Url,
    navigation: u64,
    cancellation: u64,
) -> Result<(), String> {
    let location = page_url::read(view).await?;
    if super::NAVIGATION_GENERATION.load(Ordering::SeqCst) != navigation
        || super::CAPTURE_GENERATION.load(Ordering::SeqCst) != cancellation
        || location.loading
        || location.url.as_ref() != Some(url)
    {
        Err("The browser capture was cancelled or the page changed. Try again.".into())
    } else {
        Ok(())
    }
}

#[derive(serde::Serialize)]
struct Slice {
    width: f64,
    height: f64,
    bytes: usize,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Manifest<'a> {
    version: u8,
    request_id: &'a str,
    url: &'a str,
    title: &'a str,
    slices: Vec<Slice>,
}

fn encode(id: &str, page: &Page, images: &[(Vec<u8>, f64)]) -> Result<Vec<u8>, String> {
    let manifest = Manifest {
        version: 1,
        request_id: id,
        url: &page.url,
        title: &page.title,
        slices: images
            .iter()
            .map(|(bytes, height)| Slice {
                width: page.r#box.width,
                height: *height,
                bytes: bytes.len(),
            })
            .collect(),
    };
    let header = serde_json::to_vec(&manifest).map_err(|error| error.to_string())?;
    if header.len() > 256 * 1024
        || header.len() + 4 + images.iter().map(|(b, _)| b.len()).sum::<usize>() > MAX_CAPTURE_BYTES
    {
        return Err("The screenshot is too large to import safely.".into());
    }
    let mut output = (header.len() as u32).to_le_bytes().to_vec();
    output.extend(header);
    for (bytes, _) in images {
        output.extend(bytes);
    }
    Ok(output)
}

fn append_tile(
    row: &mut image::RgbaImage,
    captured: &image::RgbaImage,
    viewport: (f64, f64),
    scale: f64,
    source: Rect,
    left: f64,
) -> Result<(), String> {
    if source.x < -0.01
        || source.y < -0.01
        || source.x + source.width > viewport.0 + 0.01
        || source.y + source.height > viewport.1 + 0.01
    {
        return Err("This page prevents scrolling to the requested capture area.".into());
    }
    let x = (source.x.max(0.0) * scale).round() as u32;
    let y = (source.y.max(0.0) * scale).round() as u32;
    let dest_x = (left * scale).round() as u32;
    if dest_x >= row.width() {
        return Err("The screenshot tile has no visible pixels.".into());
    }
    let width = (((left + source.width) * scale).round() as u32 - dest_x).min(row.width() - dest_x);
    if width == 0 || x + width > captured.width() || y + row.height() > captured.height() {
        return Err("The browser changed its capture bounds. Try again.".into());
    }
    let tile = image::imageops::crop_imm(captured, x, y, width, row.height()).to_image();
    image::imageops::replace(row, &tile, dest_x as i64, 0);
    Ok(())
}

fn scroll_position(target: f64, length: f64, origin: f64, viewport: f64) -> f64 {
    if target >= origin && target + length <= origin + viewport {
        origin
    } else {
        target
    }
}

async fn collect(
    view: &tauri::Webview,
    url: &url::Url,
    id: &str,
    scope: Scope,
    navigation: u64,
    cancellation: u64,
) -> Result<Vec<u8>, String> {
    let mut page = command(view, id, "prepare", serde_json::json!({"scope": scope})).await?;
    let scale = capture::pixel_ratio(view).await?;
    page.validate_pixels(scale)?;
    if matches!(scope, Scope::Full) && page.r#box.height > page.viewport_height {
        let step = page
            .viewport_height
            .max(200.0)
            .max(page.r#box.height / 32.0);
        let mut y = 0.0;
        while y < page.r#box.height {
            unchanged(view, url, navigation, cancellation).await?;
            command(
                view,
                id,
                "scroll",
                serde_json::json!({"x": 0, "y": y, "hideFixed": false}),
            )
            .await?;
            tokio::time::sleep(Duration::from_millis(50)).await;
            y += step;
        }
        page = command(view, id, "measure", serde_json::json!({})).await?;
    }
    let rect = page.r#box;
    page.validate_pixels(scale)?;
    let physical_width = (rect.width * scale).round() as u32;
    let step_y = page
        .viewport_height
        .min((16_000_000.0 / (physical_width as f64 * scale)).floor());
    if step_y < 1.0 || (rect.height / step_y).ceil() > 1024.0 {
        return Err("The browser viewport is too small for this screenshot.".into());
    }
    let mut images = Vec::new();
    let mut payload_size = 0;
    let mut top = 0.0;
    let mut origin = (page.x, page.y);
    while top < rect.height {
        let bottom = (top + step_y).min(rect.height);
        let height = bottom - top;
        let mut row = image::RgbaImage::new(physical_width, (height * scale).round() as u32);
        let mut left = 0.0;
        while left < rect.width {
            unchanged(view, url, navigation, cancellation).await?;
            let width = (rect.width - left).min(page.viewport_width);
            let position = if matches!(scope, Scope::Selected | Scope::Visible) {
                (
                    scroll_position(rect.x + left, width, origin.0, page.viewport_width),
                    scroll_position(rect.y + top, height, origin.1, page.viewport_height),
                )
            } else {
                (rect.x + left, rect.y + top)
            };
            let current = command(
                view,
                id,
                "scroll",
                serde_json::json!({
                    "x": position.0, "y": position.1,
                    "hideFixed": !matches!(scope, Scope::Visible) && (left > 0.0 || top > 0.0)
                }),
            )
            .await?;
            origin = (current.x, current.y);
            tokio::time::sleep(Duration::from_millis(50)).await;
            let source = Rect {
                x: rect.x + left - current.x,
                y: rect.y + top - current.y,
                width,
                height,
            };
            let clipped = (page.viewport_width * scale).ceil()
                * (page.viewport_height * scale).ceil()
                > 16_000_000.0;
            let bytes = if clipped {
                capture::region(
                    view,
                    capture::CaptureRect {
                        x: source.x,
                        y: source.y,
                        width: source.width,
                        height: source.height,
                    },
                )
                .await?
            } else {
                capture::snapshot(view).await?
            };
            unchanged(view, url, navigation, cancellation).await?;
            let after = command(view, id, "read", serde_json::json!({})).await?;
            if after.x != current.x || after.y != current.y {
                return Err("The page scrolled during capture. Try again.".into());
            }
            let captured = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
                .map_err(|_| "The browser screenshot could not be decoded.")?
                .into_rgba8();
            let viewport = if clipped {
                (width, height)
            } else {
                (page.viewport_width, page.viewport_height)
            };
            if captured.width() != (viewport.0 * scale).round() as u32
                || captured.height() != (viewport.1 * scale).round() as u32
            {
                return Err("The browser display scale changed during capture. Try again.".into());
            }
            append_tile(
                &mut row,
                &captured,
                viewport,
                scale,
                if clipped {
                    Rect {
                        x: 0.0,
                        y: 0.0,
                        width,
                        height,
                    }
                } else {
                    source
                },
                left,
            )?;
            left += width;
        }
        let mut png = std::io::Cursor::new(Vec::new());
        row.write_to(&mut png, image::ImageFormat::Png)
            .map_err(|_| "The screenshot could not be encoded.")?;
        let png = png.into_inner();
        payload_size += png.len();
        if payload_size > MAX_CAPTURE_BYTES {
            return Err("The screenshot is too large to import safely.".into());
        }
        images.push((png, height));
        top = bottom;
    }
    encode(id, &page, &images)
}

pub(super) async fn run(
    view: &tauri::Webview,
    url: &url::Url,
    id: &str,
    scope: Scope,
    navigation: u64,
    cancellation: u64,
) -> Result<Vec<u8>, String> {
    CAPTURING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .map_err(|_| "A browser screenshot is already in progress.")?;
    let _lease = Lease;
    unchanged(view, url, navigation, cancellation).await?;
    picker::stage(view, true).await?;
    let result = collect(view, url, id, scope, navigation, cancellation).await;
    // Cleanup runs even after prepare, scrolling, decoding, cancellation or payload failure.
    let restored = evaluate(view, id, "restore", serde_json::json!({})).await;
    let picker_restored = picker::stage(view, false).await;
    let bytes = result?;
    restored?;
    picker_restored?;
    unchanged(view, url, navigation, cancellation).await?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stitches_display_scale_tiles_and_crops_the_last_scrolled_edge() {
        assert_eq!(scroll_position(16.0, 100.0, 0.0, 600.0), 0.0);
        assert_eq!(scroll_position(900.0, 100.0, 0.0, 600.0), 900.0);
        let pixels =
            image::RgbaImage::from_fn(8, 6, |x, y| image::Rgba([x as u8, y as u8, 55, 255]));
        let mut row = image::RgbaImage::new(10, 2);
        append_tile(
            &mut row,
            &pixels,
            (4.0, 3.0),
            2.0,
            Rect {
                x: 0.0,
                y: 1.0,
                width: 4.0,
                height: 1.0,
            },
            0.0,
        )
        .unwrap();
        append_tile(
            &mut row,
            &pixels,
            (4.0, 3.0),
            2.0,
            Rect {
                x: 3.0,
                y: 2.0,
                width: 1.0,
                height: 1.0,
            },
            4.0,
        )
        .unwrap();
        assert_eq!(row.get_pixel(0, 0).0, [0, 2, 55, 255]);
        assert_eq!(row.get_pixel(7, 1).0, [7, 3, 55, 255]);
        assert_eq!(row.get_pixel(8, 0).0, [6, 4, 55, 255]);
        assert_eq!(row.get_pixel(9, 1).0, [7, 5, 55, 255]);
        assert!(append_tile(
            &mut row,
            &pixels,
            (4.0, 3.0),
            2.0,
            Rect {
                x: 3.0,
                y: 2.0,
                width: 2.0,
                height: 1.0
            },
            0.0
        )
        .is_err());
    }

    #[test]
    fn bounds_total_pixels_and_encodes_slice_dimensions_separately_from_bytes() {
        let mut page = Page {
            url: "https://example.test/".into(),
            title: "Page".into(),
            r#box: Rect {
                x: 0.0,
                y: 0.0,
                width: 400.0,
                height: 1600.0,
            },
            viewport_width: 400.0,
            viewport_height: 600.0,
            x: 0.0,
            y: 0.0,
        };
        assert!(page.validate().is_ok());
        assert!(page.validate_pixels(2.0).is_ok());
        let packet = encode(
            "request",
            &page,
            &[(vec![1, 2, 3], 600.0), (vec![4, 5], 1000.0)],
        )
        .unwrap();
        let length = u32::from_le_bytes(packet[..4].try_into().unwrap()) as usize;
        let manifest: serde_json::Value = serde_json::from_slice(&packet[4..4 + length]).unwrap();
        assert_eq!(manifest["slices"][1]["height"], 1000.0);
        assert_eq!(&packet[4 + length..], &[1, 2, 3, 4, 5]);
        page.r#box.height = 65536.0;
        page.r#box.width = 16384.0;
        assert!(page.validate_pixels(2.0).is_err());
        assert!(page.validate_pixels(0.1).is_ok());
    }
}
