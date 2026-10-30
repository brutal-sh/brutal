use tauri::Emitter;

#[cfg(any(debug_assertions, not(target_os = "macos")))]
use tauri::Manager;

pub fn handle_menu_event<R: tauri::Runtime>(app: &tauri::AppHandle<R>, event_id: &str) {
    #[cfg(debug_assertions)]
    if event_id == "dev-tools" {
        if let Some(window) = app.get_webview("main") {
            if window.is_devtools_open() {
                window.close_devtools();
            } else {
                window.open_devtools();
            }
        }
        return;
    }
    #[cfg(not(target_os = "macos"))]
    if event_id == "toggle-fullscreen" {
        if let Some(window) = app.get_window("main") {
            match window
                .is_fullscreen()
                .and_then(|current| window.set_fullscreen(!current))
            {
                Ok(()) => {}
                Err(error) => eprintln!("[Menu] Cannot toggle fullscreen: {error}"),
            }
        }
        return;
    }
    let _ = app.emit("menu-event", event_id);
}
