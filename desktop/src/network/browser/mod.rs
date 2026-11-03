//! An isolated child webview. Visited content has no app commands or plugin capabilities.
mod capture;
mod clear;
mod extract;
pub mod history;
mod page_url;
mod picker;
pub mod policy;
mod screenshot;
mod viewport;

use policy::{preview_url, require_editor, DockBounds, PREVIEW_LABEL};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{
    webview::{PageLoadEvent, WebviewBuilder},
    LogicalPosition, LogicalSize, Manager, Webview, WebviewUrl,
};

static NAVIGATION_GENERATION: AtomicU64 = AtomicU64::new(0);
static CAPTURE_GENERATION: AtomicU64 = AtomicU64::new(0);

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewStatus {
    url: String,
    title: String,
    x: f64,
    y: f64,
    window_label: String,
    width: f64,
    height: f64,
    capture_available: bool,
    loading: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    can_go_back: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    can_go_forward: Option<bool>,
}

async fn status(
    view: &Webview,
    location: page_url::PageLocation,
) -> Result<Option<PreviewStatus>, String> {
    let Some(bounds) = viewport::bounds(view).await? else {
        return Ok(None);
    };
    let Some(url) = location.url else {
        return Ok(None);
    };
    Ok(Some(PreviewStatus {
        x: bounds.x,
        y: bounds.y,
        window_label: view.window().label().into(),
        title: url.host_str().unwrap_or("Browser preview").into(),
        url: url.to_string(),
        width: bounds.width,
        height: bounds.height,
        capture_available: cfg!(target_os = "macos"),
        loading: location.loading,
        can_go_back: location.can_go_back,
        can_go_forward: location.can_go_forward,
    }))
}

fn existing(app: &tauri::AppHandle) -> Result<Webview, String> {
    app.get_webview(PREVIEW_LABEL)
        .ok_or_else(|| "Open a page in the preview first.".into())
}

fn validate_bounds(view: &Webview, bounds: &DockBounds) -> Result<(), String> {
    let window = view.window();
    let size = window
        .inner_size()
        .map_err(|e| e.to_string())?
        .to_logical::<f64>(window.scale_factor().map_err(|e| e.to_string())?);
    bounds.validate(size.width, size.height)
}

#[tauri::command]
pub async fn browser_preview_open(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    bounds: DockBounds,
    zoom: Option<f64>,
    viewport: Option<viewport::Size>,
) -> Result<PreviewStatus, String> {
    require_editor(webview.label())?;
    let zoom = policy::preview_zoom(zoom)?;
    let size = viewport
        .unwrap_or(viewport::Size {
            width: bounds.width / zoom,
            height: bounds.height / zoom,
        })
        .validate()?;
    validate_bounds(&webview, &bounds)?;
    let dev_url = app.config().build.dev_url.clone();
    let target = preview_url(&url, dev_url.as_ref())?;
    let view = if let Some(view) = app.get_webview(PREVIEW_LABEL) {
        view.navigate(target.clone()).map_err(|e| e.to_string())?;
        view
    } else {
        let builder = WebviewBuilder::new(PREVIEW_LABEL, WebviewUrl::External(target.clone()))
            .incognito(true)
            .disable_drag_drop_handler()
            .on_navigation(move |url| {
                let allowed = preview_url(url.as_str(), dev_url.as_ref()).is_ok();
                if allowed {
                    NAVIGATION_GENERATION.fetch_add(1, Ordering::SeqCst);
                }
                allowed
            })
            .on_page_load(|view, payload| {
                if matches!(payload.event(), PageLoadEvent::Finished) {
                    history::completed(&view, payload.url());
                }
            })
            .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
            .on_download(|_, _| false)
            .on_permission_request(|_, _| tauri::webview::PermissionResponse::Deny);
        webview
            .window()
            .add_child(
                builder,
                LogicalPosition::new(bounds.x, bounds.y),
                LogicalSize::new(bounds.width, bounds.height),
            )
            .map_err(|e| e.to_string())?
    };
    viewport::set_bounds(&view, bounds, size).await?;
    viewport::visible(&view, true).await?;
    let mut location = page_url::read(&view).await?;
    location.url.get_or_insert(target);
    status(&view, location)
        .await?
        .ok_or("The browser closed before its viewport was ready.".into())
}

#[tauri::command]
pub async fn browser_preview_status(
    app: tauri::AppHandle,
    webview: Webview,
) -> Result<Option<PreviewStatus>, String> {
    require_editor(webview.label())?;
    let Some(view) = app.get_webview(PREVIEW_LABEL) else {
        return Ok(None);
    };
    let location = page_url::read(&view).await?;
    status(&view, location).await
}

#[tauri::command]
pub async fn browser_preview_clear_site_data(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
) -> Result<(), String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    clear::run(&existing(&app)?, &target).await
}

#[tauri::command]
pub async fn browser_preview_picker(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    request_id: String,
    action: picker::PickerAction,
    index: Option<usize>,
) -> Result<serde_json::Value, String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    let view = existing(&app)?;
    let generation = NAVIGATION_GENERATION.load(Ordering::SeqCst);
    let location = page_url::read(&view).await?;
    if location.loading || location.url.as_ref() != Some(&target) {
        return Err("Wait for the page to finish loading, then select an element.".into());
    }
    let result = picker::update(&view, &request_id, action, index).await?;
    let location = page_url::read(&view).await?;
    if NAVIGATION_GENERATION.load(Ordering::SeqCst) != generation
        || location.loading
        || location.url.as_ref() != Some(&target)
    {
        return Err("The browser page changed. Select the element again.".into());
    }
    Ok(result)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PreviewAction {
    Back,
    Forward,
    Reload,
    Focus,
    Close,
    CancelCapture,
}

#[tauri::command]
pub async fn browser_preview_action(
    app: tauri::AppHandle,
    webview: Webview,
    action: PreviewAction,
) -> Result<(), String> {
    require_editor(webview.label())?;
    if matches!(action, PreviewAction::CancelCapture) {
        CAPTURE_GENERATION.fetch_add(1, Ordering::SeqCst);
        return Ok(());
    }
    let Some(view) = app.get_webview(PREVIEW_LABEL) else {
        return if matches!(action, PreviewAction::Close) {
            Ok(())
        } else {
            Err("Open a page in the preview first.".into())
        };
    };
    match action {
        PreviewAction::Back => view.eval("history.back()"),
        PreviewAction::Forward => view.eval("history.forward()"),
        PreviewAction::Reload => view.reload(),
        PreviewAction::Focus => view.set_focus(),
        PreviewAction::Close => {
            NAVIGATION_GENERATION.fetch_add(1, Ordering::SeqCst);
            let detached = viewport::detach(&view).await;
            view.close().map_err(|e| e.to_string())?;
            detached?;
            webview.set_focus()
        }
        PreviewAction::CancelCapture => Ok(()),
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_preview_backdrop(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
) -> Result<tauri::ipc::Response, String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    let view = existing(&app)?;
    let navigation = NAVIGATION_GENERATION.load(Ordering::SeqCst);
    let cancellation = CAPTURE_GENERATION.load(Ordering::SeqCst);
    let location = page_url::read(&view).await?;
    if location.loading || location.url.as_ref() != Some(&target) {
        return Err("Wait for the page to finish loading before opening this popup.".into());
    }
    // A popup frame must not change page animation/scroll state or hold closing behind a slow page.
    let bounds = viewport::bounds(&view)
        .await?
        .ok_or("The browser viewport is not ready.")?;
    let bytes = tokio::time::timeout(
        std::time::Duration::from_secs(1),
        capture::backdrop(&view, bounds.width),
    )
    .await
    .map_err(|_| "The browser frame was not ready in time.")??;
    let location = page_url::read(&view).await?;
    if NAVIGATION_GENERATION.load(Ordering::SeqCst) != navigation
        || CAPTURE_GENERATION.load(Ordering::SeqCst) != cancellation
        || location.loading
        || location.url.as_ref() != Some(&target)
    {
        return Err("The browser page changed before its popup was ready.".into());
    }
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub async fn browser_preview_screenshot(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    request_id: String,
    scope: screenshot::Scope,
) -> Result<tauri::ipc::Response, String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    let view = existing(&app)?;
    let navigation = NAVIGATION_GENERATION.load(Ordering::SeqCst);
    let cancellation = CAPTURE_GENERATION.load(Ordering::SeqCst);
    screenshot::run(&view, &target, &request_id, scope, navigation, cancellation)
        .await
        .map(tauri::ipc::Response::new)
}

#[tauri::command]
pub async fn browser_preview_extract(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    request_id: String,
    selected: Option<bool>,
) -> Result<serde_json::Value, String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    let view = existing(&app)?;
    let generation = NAVIGATION_GENERATION.load(Ordering::SeqCst);
    let location = page_url::read(&view).await?;
    if location.loading || location.url.as_ref() != Some(&target) {
        return Err("Wait for the page to finish loading, then import again.".into());
    }
    let result = extract::page(&view, &request_id, selected.unwrap_or(false)).await?;
    let location = page_url::read(&view).await?;
    if NAVIGATION_GENERATION.load(Ordering::SeqCst) != generation
        || location.loading
        || location.url.as_ref() != Some(&target)
        || result.get("url").and_then(|url| url.as_str()) != Some(target.as_str())
    {
        return Err("The preview changed during extraction. Import again.".into());
    }
    Ok(result)
}

#[tauri::command]
pub async fn browser_preview_resize(
    app: tauri::AppHandle,
    webview: Webview,
    bounds: DockBounds,
    zoom: Option<f64>,
    viewport: Option<viewport::Size>,
) -> Result<(), String> {
    require_editor(webview.label())?;
    let zoom = policy::preview_zoom(zoom)?;
    let size = viewport
        .unwrap_or(viewport::Size {
            width: bounds.width / zoom,
            height: bounds.height / zoom,
        })
        .validate()?;
    validate_bounds(&webview, &bounds)?;
    let view = existing(&app)?;
    viewport::set_bounds(&view, bounds, size).await
}

/// Hides the native surface behind editor dialogs; the web page stays loaded.
#[tauri::command]
pub async fn browser_preview_layout(
    app: tauri::AppHandle,
    webview: Webview,
    bounds: Option<DockBounds>,
    zoom: Option<f64>,
    viewport: Option<viewport::Size>,
) -> Result<(), String> {
    require_editor(webview.label())?;
    let zoom = policy::preview_zoom(zoom)?;
    let Some(view) = app.get_webview(PREVIEW_LABEL) else {
        return Ok(());
    };
    if let Some(bounds) = bounds {
        validate_bounds(&webview, &bounds)?;
        let size = viewport
            .unwrap_or(viewport::Size {
                width: bounds.width / zoom,
                height: bounds.height / zoom,
            })
            .validate()?;
        viewport::set_bounds(&view, bounds, size).await?;
        viewport::visible(&view, true).await
    } else {
        // Hiding a focused WKWebView does not return keyboard ownership to the editor.
        viewport::visible(&view, false).await?;
        webview.set_focus().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn browser_preview_capture(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    selected: Option<bool>,
) -> Result<tauri::ipc::Response, String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    let view = existing(&app)?;
    if page_url::read(&view).await?.url.as_ref() != Some(&target) {
        return Err("The preview navigated. Wait for it to load and capture again.".into());
    }
    let staged = picker::stage(&view, true).await?;
    let captured = async {
        let rect = if selected.unwrap_or(false) {
            Some(
                picker::selection_rect(&staged)?
                    .ok_or("The element selection is no longer available. Select it again.")?,
            )
        } else {
            None
        };
        let scale = capture::pixel_ratio(&view).await?;
        let bytes = capture::snapshot(&view).await?;
        if capture::pixel_ratio(&view).await? != scale {
            return Err("The browser zoom changed during capture. Try again.".into());
        }
        Ok::<_, String>((bytes, rect, scale))
    }
    .await;
    let restored = picker::stage(&view, false).await;
    let (bytes, rect, scale) = captured?;
    let restored = restored?;
    if selected.unwrap_or(false) && picker::selection_rect(&restored)? != rect {
        return Err("The selected element moved during capture. Try again.".into());
    }
    let bytes = if let Some(rect) = rect {
        let size = view
            .size()
            .map_err(|error| error.to_string())?
            .to_logical::<f64>(scale);
        capture::crop(bytes, rect, size.width, size.height)?
    } else {
        bytes
    };
    if page_url::read(&view).await?.url.as_ref() != Some(&target) {
        return Err("The preview changed during capture. Try again.".into());
    }
    Ok(tauri::ipc::Response::new(bytes))
}
