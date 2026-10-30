use crate::network::browser::policy::require_editor;

#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn sample_screen_color(
    app: tauri::AppHandle,
    webview: tauri::Webview,
) -> Result<Option<[f64; 3]>, String> {
    use block2::RcBlock;
    use objc2_app_kit::{NSColor, NSColorSampler, NSColorSpace};
    use std::cell::RefCell;

    require_editor(webview.label())?;
    let (sender, receiver) = tokio::sync::oneshot::channel();
    app.run_on_main_thread(move || {
        let pending = RefCell::new(Some(sender));
        let completion = RcBlock::new(move |color: *mut NSColor| {
            let result = if color.is_null() {
                Ok(None)
            } else {
                // AppKit owns the sample during this callback; copy its sRGB components now.
                unsafe { &*color }
                    .colorUsingColorSpace(&NSColorSpace::sRGBColorSpace())
                    .ok_or_else(|| "The sampled color could not be converted to sRGB.".to_string())
                    .and_then(|color| {
                        let values = [
                            color.redComponent(),
                            color.greenComponent(),
                            color.blueComponent(),
                        ];
                        if values.iter().all(|value| value.is_finite()) {
                            Ok(Some(values.map(|value| value.clamp(0.0, 1.0))))
                        } else {
                            Err("The sampler returned an invalid color.".into())
                        }
                    })
            };
            if let Some(sender) = pending.borrow_mut().take() {
                let _ = sender.send(result);
            }
        });
        // AppKit retains the sampler and completion until selection or Escape cancellation.
        unsafe { NSColorSampler::new().showSamplerWithSelectionHandler(&completion) };
    })
    .map_err(|error| error.to_string())?;
    receiver
        .await
        .map_err(|_| "The color sampler closed before returning a result.".to_string())?
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub async fn sample_screen_color(webview: tauri::Webview) -> Result<Option<[f64; 3]>, String> {
    require_editor(webview.label())?;
    Err("Screen color sampling is currently available on macOS.".into())
}
