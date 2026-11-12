mod agents;
mod commands;
mod credentials;
mod files;
mod fonts;
mod icons;
mod launch;
mod menu;
mod network;
mod runtime;
mod system;

use menu::events::handle_menu_event;
use menu::{NativeMenuInputs, NativeMenuState};
use network::http::ProxyHttpRequests;
use std::sync::Mutex;

pub(crate) fn app_context() -> tauri::Context<tauri::Wry> {
    tauri::generate_context!()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if !launch::args::accepts_profile_arguments(
        cfg!(feature = "native-test"),
        std::env::args_os().skip(1),
    ) {
        eprintln!("Recovery profile arguments require an isolated Open Pen native-test build.");
        return;
    }
    // Native acceptance launches pin their own executable search order.
    #[cfg(not(feature = "native-test"))]
    let _ = fix_path_env::fix();
    agents::path::augment_process_path();

    let builder = runtime::builder();
    let builder = builder
        .manage(launch::PendingOpen::default())
        .manage(ProxyHttpRequests::default())
        .manage(network::oauth::ChatGPTOAuthLoopback::default())
        .manage(launch::PendingRooms::default())
        .manage(NativeMenuState(Mutex::new(NativeMenuInputs::default())))
        .manage(launch::PendingCloudLinks::default())
        .invoke_handler(commands::handler())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .on_menu_event(|app, event| {
            handle_menu_event(app, event.id().0.as_str());
        })
        .setup(|app| {
            #[cfg(feature = "native-test")]
            agents::native_test::profile_startup::build_profile_window(app)?;
            runtime::setup_app(app)
        });
    let context = app_context();
    #[cfg(feature = "native-test")]
    let context = agents::native_test::profile_startup::configure_context(context)
        .expect("error while configuring isolated Open Pen native tests");
    builder
        .build(context)
        .expect("error while building tauri application")
        .run(runtime::on_event);
}
