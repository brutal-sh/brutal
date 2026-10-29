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
