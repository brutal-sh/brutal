pub(super) struct PageLocation {
    pub url: Option<url::Url>,
    pub loading: bool,
    pub can_go_back: Option<bool>,
    pub can_go_forward: Option<bool>,
}

#[cfg(target_os = "macos")]
pub(super) async fn read(view: &tauri::Webview) -> Result<PageLocation, String> {
    use objc2_web_kit::WKWebView;

    let (sender, receiver) = tokio::sync::oneshot::channel();
    view.with_webview(move |native| {
        // Wry unwraps WKWebView.URL, which is nil before the first navigation starts.
        let view = unsafe { &*native.inner().cast::<WKWebView>() };
        let url = unsafe { view.URL() }
            .and_then(|url| url.absoluteString())
            .map(|url| url::Url::parse(&url.to_string()).map_err(|error| error.to_string()))
            .transpose()
            .map(|url| PageLocation {
                url,
                loading: unsafe { view.isLoading() },
                can_go_back: Some(unsafe { view.canGoBack() }),
                can_go_forward: Some(unsafe { view.canGoForward() }),
            });
        let _ = sender.send(url);
    })
    .map_err(|error| error.to_string())?;
    tokio::time::timeout(std::time::Duration::from_secs(5), receiver)
        .await
        .map_err(|_| "The browser URL check timed out. Try again.")?
        .map_err(|_| "The browser closed before its URL could be read.".to_string())?
}

#[cfg(not(target_os = "macos"))]
pub(super) async fn read(view: &tauri::Webview) -> Result<PageLocation, String> {
    view.url()
        .map(|url| PageLocation {
            url: Some(url),
            loading: false,
            can_go_back: None,
            can_go_forward: None,
        })
        .map_err(|error| error.to_string())
}
