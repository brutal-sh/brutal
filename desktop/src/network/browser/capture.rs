#[cfg(target_os = "macos")]
use super::policy::MAX_CAPTURE_BYTES;

#[cfg(target_os = "macos")]
pub async fn snapshot(window: &tauri::Webview) -> Result<Vec<u8>, String> {
    use block2::RcBlock;
    use objc2::{AnyThread, MainThreadMarker};
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
    use objc2_foundation::{NSDictionary, NSError};
    use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};
    use std::cell::RefCell;
    use std::time::Duration;

    let (sender, receiver) = tokio::sync::oneshot::channel();
    window
        .with_webview(move |native| {
            let Some(mtm) = MainThreadMarker::new() else {
                let _ = sender.send(Err("Capture needs the application's main thread.".into()));
                return;
            };
            // Tauri's platform handle is a live WKWebView, and this closure runs on its main thread.
            let view = unsafe { &*native.inner().cast::<WKWebView>() };
            if unsafe { view.isLoading() } {
                let _ = sender.send(Err(
                    "Wait for the page to finish loading, then capture again.".into(),
                ));
                return;
            }
            let pending = RefCell::new(Some(sender));
            let completion = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
                let result = (|| {
                    if !error.is_null() || image.is_null() {
                        return Err("The browser could not capture this page.".into());
                    }
                    // WebKit owns the image during this completion; copy PNG bytes before returning.
                    let image = unsafe { &*image };
                    let tiff = image
                        .TIFFRepresentation()
                        .ok_or("The captured image is empty.")?;
                    let bitmap = NSBitmapImageRep::initWithData(NSBitmapImageRep::alloc(), &tiff)
                        .ok_or("The browser image could not be encoded.")?;
                    if bitmap.pixelsWide() <= 0
                        || bitmap.pixelsHigh() <= 0
                        || bitmap.pixelsWide().saturating_mul(bitmap.pixelsHigh()) > 16_000_000
                    {
                        return Err("The captured image dimensions are too large.".into());
                    }
                    // An empty options dictionary satisfies AppKit's typed property contract.
                    let png = unsafe {
                        bitmap.representationUsingType_properties(
                            NSBitmapImageFileType::PNG,
                            &NSDictionary::new(),
                        )
                    }
                    .ok_or("The browser image could not be encoded as PNG.")?;
                    if png.len() > MAX_CAPTURE_BYTES {
                        return Err("The captured image is too large.".into());
                    }
                    Ok(png.to_vec())
                })();
                if let Some(sender) = pending.borrow_mut().take() {
                    let _ = sender.send(result);
                }
            });
            let configuration = unsafe { WKSnapshotConfiguration::new(mtm) };
            unsafe {
                configuration.setAfterScreenUpdates(true);
                view.takeSnapshotWithConfiguration_completionHandler(
                    Some(&configuration),
                    &completion,
                );
            }
        })
        .map_err(|e| e.to_string())?;
    tokio::time::timeout(Duration::from_secs(15), receiver)
        .await
        .map_err(|_| "The browser capture timed out. Try again.")?
        .map_err(|_| "The browser closed before capture finished.")?
}

#[cfg(not(target_os = "macos"))]
pub async fn snapshot(_window: &tauri::Webview) -> Result<Vec<u8>, String> {
    Err("Browser capture is currently available on macOS.".into())
}

#[derive(Clone, Copy, Debug, PartialEq, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct CaptureRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

pub(super) fn crop(
    bytes: Vec<u8>,
    rect: CaptureRect,
    viewport_width: f64,
    viewport_height: f64,
) -> Result<Vec<u8>, String> {
    if [
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        viewport_width,
        viewport_height,
    ]
    .iter()
    .any(|value| !value.is_finite())
        || rect.x < 0.0
        || rect.y < 0.0
        || rect.width <= 0.0
        || rect.height <= 0.0
        || viewport_width <= 0.0
        || viewport_height <= 0.0
        || rect.x + rect.width > viewport_width
        || rect.y + rect.height > viewport_height
    {
        // shortcut: selected snapshots must fit the viewport; use stitched capture for offscreen elements.
        return Err("Keep the selected element inside the visible page before capturing.".into());
    }
    let image = image::load_from_memory_with_format(&bytes, image::ImageFormat::Png)
        .map_err(|_| "The browser snapshot could not be read.")?;
    let scale_x = image.width() as f64 / viewport_width;
    let scale_y = image.height() as f64 / viewport_height;
    let x = (rect.x * scale_x).floor() as u32;
    let y = (rect.y * scale_y).floor() as u32;
    let right = ((rect.x + rect.width) * scale_x).ceil() as u32;
    let bottom = ((rect.y + rect.height) * scale_y).ceil() as u32;
    let cropped = image.crop_imm(
        x,
        y,
        right.min(image.width()) - x,
        bottom.min(image.height()) - y,
    );
    let mut output = std::io::Cursor::new(Vec::new());
    cropped
        .write_to(&mut output, image::ImageFormat::Png)
        .map_err(|_| "The selected element could not be encoded as PNG.")?;
    let output = output.into_inner();
    if output.len() > super::policy::MAX_CAPTURE_BYTES {
        return Err("The selected element image is too large.".into());
    }
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn crops_selected_pixels_at_display_scale_and_rejects_outside_bounds() {
        let pixels =
            image::RgbaImage::from_fn(8, 6, |x, y| image::Rgba([x as u8, y as u8, 55, 255]));
        let mut png = std::io::Cursor::new(Vec::new());
        pixels.write_to(&mut png, image::ImageFormat::Png).unwrap();
        let bytes = png.into_inner();
        let rect = CaptureRect {
            x: 1.0,
            y: 1.0,
            width: 2.0,
            height: 1.0,
        };
        let selected = crop(bytes.clone(), rect, 4.0, 3.0).unwrap();
        let selected = image::load_from_memory_with_format(&selected, image::ImageFormat::Png)
            .unwrap()
            .into_rgba8();
        assert_eq!(selected.dimensions(), (4, 2));
        assert_eq!(selected.get_pixel(0, 0).0, [2, 2, 55, 255]);
        assert_eq!(selected.get_pixel(3, 1).0, [5, 3, 55, 255]);
        assert!(crop(bytes.clone(), CaptureRect { x: -1.0, ..rect }, 4.0, 3.0).is_err());
        assert!(crop(
            bytes.clone(),
            CaptureRect {
                height: 3.0,
                ..rect
            },
            4.0,
            3.0
        )
        .is_err());
        assert!(crop(
            bytes,
            CaptureRect {
                width: f64::NAN,
                ..rect
            },
            4.0,
            3.0
        )
        .is_err());
    }
}
