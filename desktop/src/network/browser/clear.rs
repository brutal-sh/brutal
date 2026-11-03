use super::{page_url, NAVIGATION_GENERATION};
use std::sync::atomic::Ordering;

fn matches_host(host: &str, domain: &str) -> bool {
    let domain = domain.trim_start_matches('.');
    !domain.is_empty()
        && (host == domain
            || host.ends_with(&format!(".{domain}"))
            || domain.ends_with(&format!(".{host}")))
}

async fn unchanged(view: &tauri::Webview, url: &url::Url, generation: u64) -> Result<(), String> {
    let location = page_url::read(view).await?;
    if location.loading
        || location.url.as_ref() != Some(url)
        || NAVIGATION_GENERATION.load(Ordering::SeqCst) != generation
    {
        Err("The browser page changed. Open its menu and try again.".into())
    } else {
        Ok(())
    }
}

#[cfg(target_os = "macos")]
async fn storage(view: &tauri::Webview, origin: String) -> Result<(), String> {
    use block2::RcBlock;
    use objc2::{runtime::AnyObject, MainThreadMarker};
    use objc2_foundation::{NSError, NSString};
    use objc2_web_kit::{WKContentWorld, WKWebView};
    use std::cell::RefCell;
    let (sender, receiver) = tokio::sync::oneshot::channel();
    let script = format!(
        "const expectedOrigin = {};\n{}",
        serde_json::to_string(&origin).map_err(|e| e.to_string())?,
        include_str!("clear.js")
    );
    view.with_webview(move |native| {
        let Some(mtm) = MainThreadMarker::new() else {
            let _ = sender.send(Err("Clearing site data needs the main thread.".into()));
            return;
        };
        let pending = RefCell::new(Some(sender));
        let completion = RcBlock::new(move |_value: *mut AnyObject, error: *mut NSError| {
            if let Some(sender) = pending.borrow_mut().take() {
                let _ = sender.send(if error.is_null() {
                    Ok(())
                } else {
                    Err("Some site data may have been cleared. Close other pages for this site, then try again.".into())
                });
            }
        });
        // The live platform handle and client content world are confined to the main thread.
        unsafe {
            let view = &*native.inner().cast::<WKWebView>();
            view.callAsyncJavaScript_arguments_inFrame_inContentWorld_completionHandler(
                &NSString::from_str(&script),
                None,
                None,
                &WKContentWorld::defaultClientWorld(mtm),
                Some(&completion),
            );
        }
    })
    .map_err(|e| e.to_string())?;
    tokio::time::timeout(std::time::Duration::from_secs(10), receiver)
        .await
        .map_err(|_| "Clearing site data timed out; some data may have been removed.")?
        .map_err(|_| "The browser closed while clearing site data.".to_owned())?
}

#[cfg(not(target_os = "macos"))]
async fn storage(_view: &tauri::Webview, _origin: String) -> Result<(), String> {
    Err("Clearing site data is currently available on macOS.".into())
}

pub(super) async fn run(view: &tauri::Webview, url: &url::Url) -> Result<(), String> {
    let generation = NAVIGATION_GENERATION.load(Ordering::SeqCst);
    unchanged(view, url, generation).await?;
    storage(view, url.origin().ascii_serialization()).await?;
    unchanged(view, url, generation).await?;
    let host = url.host_str().ok_or("The page has no website host.")?;
    for cookie in view.cookies().map_err(|e| e.to_string())? {
        if cookie
            .domain()
            .is_some_and(|domain| matches_host(host, domain))
        {
            view.delete_cookie(cookie).map_err(|e| e.to_string())?;
        }
    }
    unchanged(view, url, generation).await?;
    view.reload().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::matches_host;
    #[test]
    fn removes_only_related_cookie_domains() {
        for domain in [
            "example.test",
            ".example.test",
            "mobile.example.test",
            "a.mobile.example.test",
        ] {
            assert!(matches_host("mobile.example.test", domain), "{domain}");
        }
        for domain in [
            "",
            "other.test",
            "notexample.test",
            "mobile.example.test.attacker.test",
        ] {
            assert!(!matches_host("mobile.example.test", domain), "{domain}");
        }
    }
}
