//! An isolated child webview. Visited content has no app commands or plugin capabilities.
mod capture;
pub mod policy;

use policy::{preview_url, require_editor, DockBounds, PREVIEW_LABEL};
use tauri::{webview::WebviewBuilder, LogicalPosition, LogicalSize, Manager, Webview, WebviewUrl};

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

fn status(view: &Webview) -> Result<PreviewStatus, String> {
    let size = view
        .size()
        .map_err(|e| e.to_string())?
        .to_logical::<u32>(view.window().scale_factor().map_err(|e| e.to_string())?);
    let position = view
        .position()
        .map_err(|e| e.to_string())?
        .to_logical::<i32>(view.window().scale_factor().map_err(|e| e.to_string())?);
    let url = view.url().map_err(|e| e.to_string())?;
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
        view.navigate(target).map_err(|e| e.to_string())?;
        view
    } else {
        let builder = WebviewBuilder::new(PREVIEW_LABEL, WebviewUrl::External(target))
            .incognito(true)
            .disable_drag_drop_handler()
            .on_navigation(move |url| preview_url(url.as_str(), dev_url.as_ref()).is_ok())
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
    status(&view)
}

#[tauri::command]
pub fn browser_preview_status(
    app: tauri::AppHandle,
    webview: Webview,
) -> Result<Option<PreviewStatus>, String> {
    require_editor(webview.label())?;
    app.get_webview(PREVIEW_LABEL)
        .map(|view| status(&view))
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
        PreviewAction::Close => view.close(),
    }
    .map_err(|e| e.to_string())
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
    if view.url().map_err(|e| e.to_string())? != target {
        return Err("The preview navigated. Wait for it to load and capture again.".into());
    }
    let bytes = capture::snapshot(&view).await?;
    if view.url().map_err(|e| e.to_string())? != target {
        return Err("The preview changed during capture. Try again.".into());
    }
    Ok(tauri::ipc::Response::new(bytes))
}
