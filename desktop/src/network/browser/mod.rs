//! An isolated child webview. Visited content has no app commands or plugin capabilities.
mod capture;
mod extract;
mod page_url;
pub mod policy;

use policy::{preview_url, require_editor, DockBounds, PREVIEW_LABEL};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{webview::WebviewBuilder, LogicalPosition, LogicalSize, Manager, Webview, WebviewUrl};

static NAVIGATION_GENERATION: AtomicU64 = AtomicU64::new(0);

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewStatus {
    url: String,
    title: String,
    x: i32,
    y: i32,
    window_label: String,
    width: u32,
    height: u32,
    capture_available: bool,
}

fn status(view: &Webview, url: url::Url) -> Result<PreviewStatus, String> {
    let size = view
        .size()
        .map_err(|e| e.to_string())?
        .to_logical::<u32>(view.window().scale_factor().map_err(|e| e.to_string())?);
    let position = view
        .position()
        .map_err(|e| e.to_string())?
        .to_logical::<i32>(view.window().scale_factor().map_err(|e| e.to_string())?);
    Ok(PreviewStatus {
        x: position.x,
        y: position.y,
        window_label: view.window().label().into(),
        title: url.host_str().unwrap_or("Browser preview").into(),
        url: url.to_string(),
        width: size.width,
        height: size.height,
        capture_available: cfg!(target_os = "macos"),
    })
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

fn set_bounds(view: &Webview, bounds: DockBounds) -> Result<(), String> {
    view.set_bounds(tauri::Rect {
        position: LogicalPosition::new(bounds.x, bounds.y).into(),
        size: LogicalSize::new(bounds.width, bounds.height).into(),
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_preview_open(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    bounds: DockBounds,
) -> Result<PreviewStatus, String> {
    require_editor(webview.label())?;
    validate_bounds(&webview, &bounds)?;
    let dev_url = app.config().build.dev_url.clone();
    let target = preview_url(&url, dev_url.as_ref())?;
    let view = if let Some(view) = app.get_webview(PREVIEW_LABEL) {
        set_bounds(&view, bounds)?;
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
    view.show().map_err(|e| e.to_string())?;
    let url = page_url::read(&view).await?.unwrap_or(target);
    status(&view, url)
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
    page_url::read(&view)
        .await?
        .map(|url| status(&view, url))
        .transpose()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PreviewAction {
    Back,
    Forward,
    Reload,
    Focus,
    Close,
}

#[tauri::command]
pub async fn browser_preview_action(
    app: tauri::AppHandle,
    webview: Webview,
    action: PreviewAction,
) -> Result<(), String> {
    require_editor(webview.label())?;
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
            view.close()
        }
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn browser_preview_extract(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    request_id: String,
) -> Result<serde_json::Value, String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    let view = existing(&app)?;
    let generation = NAVIGATION_GENERATION.load(Ordering::SeqCst);
    if page_url::read(&view).await?.as_ref() != Some(&target) {
        return Err("The preview navigated. Wait for loading and import again.".into());
    }
    let result = extract::page(&view, &request_id).await?;
    if NAVIGATION_GENERATION.load(Ordering::SeqCst) != generation
        || page_url::read(&view).await?.as_ref() != Some(&target)
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
) -> Result<(), String> {
    require_editor(webview.label())?;
    validate_bounds(&webview, &bounds)?;
    set_bounds(&existing(&app)?, bounds)
}

/// Hides the native surface behind editor dialogs; the web page stays loaded.
#[tauri::command]
pub async fn browser_preview_layout(
    app: tauri::AppHandle,
    webview: Webview,
    bounds: Option<DockBounds>,
) -> Result<(), String> {
    require_editor(webview.label())?;
    let Some(view) = app.get_webview(PREVIEW_LABEL) else {
        return Ok(());
    };
    if let Some(bounds) = bounds {
        validate_bounds(&webview, &bounds)?;
        set_bounds(&view, bounds)?;
        view.show().map_err(|e| e.to_string())
    } else {
        view.hide().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn browser_preview_capture(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
) -> Result<tauri::ipc::Response, String> {
    require_editor(webview.label())?;
    let target = preview_url(&url, app.config().build.dev_url.as_ref())?;
    let view = existing(&app)?;
    if page_url::read(&view).await?.as_ref() != Some(&target) {
        return Err("The preview navigated. Wait for it to load and capture again.".into());
    }
    let bytes = capture::snapshot(&view).await?;
    if page_url::read(&view).await?.as_ref() != Some(&target) {
        return Err("The preview changed during capture. Try again.".into());
    }
    Ok(tauri::ipc::Response::new(bytes))
}
