#[cfg(target_os = "macos")]
pub(super) async fn verify(webview: &tauri::Webview, expected: [u8; 16]) -> Result<(), String> {
    use objc2_foundation::NSUUID;
    use objc2_web_kit::WKWebView;

    if !objc2::available!(macos = 14.0) {
        return Err("Persistent WebKit store identity requires macOS 14 or newer.".into());
    }
    let (sender, receiver) = tokio::sync::oneshot::channel();
    webview
        .with_webview(move |native| {
            let view = unsafe { &*native.inner().cast::<WKWebView>() };
            let actual = unsafe { view.configuration().websiteDataStore().identifier() };
            let expected = NSUUID::from_bytes(expected).UUIDString().to_string();
            let result = match actual {
                Some(id) if id.UUIDString().to_string() == expected => Ok(()),
                _ => {
                    Err("The active WebKit store does not match the owned recovery profile.".into())
                }
            };
            let _ = sender.send(result);
        })
        .map_err(|error| error.to_string())?;
    tokio::time::timeout(std::time::Duration::from_secs(5), receiver)
        .await
        .map_err(|_| "The WebKit store identity check timed out.")?
        .map_err(|_| "The WebView closed before its store identity could be read.".to_string())?
}

#[cfg(not(target_os = "macos"))]
pub(super) async fn verify(_webview: &tauri::Webview, _expected: [u8; 16]) -> Result<(), String> {
    Err("Persistent WebKit store identity requires macOS 14 or newer.".into())
}
