use crate::network;

macro_rules! app_commands {
    () => {
        tauri::generate_handler![
            crate::network::browser::browser_preview_open,
            crate::network::browser::exports::authorize_browser_export,
            crate::network::browser::exports::browser_preview_open_export,
            crate::network::browser::browser_preview_status,
            crate::network::browser::browser_preview_picker,
            crate::network::browser::history::take_browser_preview_visits,
            crate::network::browser::history::clear_browser_preview_visits,
            crate::network::browser::browser_preview_action,
            crate::network::browser::browser_preview_resize,
            crate::network::browser::browser_preview_layout,
            crate::network::browser::browser_preview_capture,
            crate::network::browser::browser_preview_screenshot,
            crate::network::browser::browser_preview_backdrop,
            crate::network::browser::browser_preview_clear_site_data,
            crate::network::browser::browser_preview_extract,
            #[cfg(feature = "native-test")]
            crate::agents::native_test::native_test_mcp_configuration,
            #[cfg(feature = "native-test")]
            crate::agents::native_test::profile_identity::native_test_recovery_identity,
            crate::agents::lookup::agent_lookup,
            crate::agents::codex::codex_acp_config,
            crate::agents::lookup::agent_workspace,
            crate::files::fig::build_fig_file,
            #[cfg(target_os = "macos")]
            crate::files::pdf::render_pdf_pages,
            #[cfg(target_os = "macos")]
            crate::files::photoshop::render_photoshop_image,
            crate::network::oauth::chatgpt_oauth_listen,
            crate::network::oauth::chatgpt_oauth_wait,
            crate::network::oauth::chatgpt_oauth_cancel,
            crate::credentials::credential_read,
            crate::credentials::credential_access_paused,
            crate::credentials::credential_retry_access,
            crate::credentials::credential_remove,
            crate::credentials::credential_status,
            crate::credentials::credential_store_availability,
            crate::credentials::credential_write,
            crate::agents::mcp::mcp_lookup,
            crate::agents::skills::skill_folders,
            crate::agents::skills::project_skill_folders,
            crate::agents::skills::skill_folder_file,
            #[cfg(feature = "native-test")]
            crate::launch::native_test_open_deep_link,
            crate::system::opener::open_external_url,
            #[cfg(feature = "native-test")]
            crate::system::opener::take_native_test_opened_urls,
            crate::launch::paths::path_matches_suffix,
            crate::fonts::list_system_fonts,
            crate::fonts::load_system_font,
            crate::icons::sf_symbols_catalogue,
            crate::icons::sf_symbols_render,
            crate::network::http::proxy_http_request,
            crate::network::http::cancel_http_request,
            crate::files::recent::set_recent_files,
            crate::menu::set_native_menu_features,
            crate::menu::native_menu_checked,
            crate::menu::set_native_menu_checked,
            crate::launch::take_pending_open,
            crate::launch::take_pending_rooms,
            crate::system::env::sharing_disabled_by_env,
            crate::launch::take_pending_cloud_links,
            crate::system::env::webview_version,
            crate::system::color::sample_screen_color,
            crate::system::raster::encode_webp
        ]
    };
}

pub(crate) fn handler() -> impl Fn(tauri::ipc::Invoke) -> bool + Send + Sync + 'static {
    let handler: fn(tauri::ipc::Invoke) -> bool = app_commands!();
    move |invoke: tauri::ipc::Invoke| {
        if !network::browser::policy::permits_app_command(invoke.message.webview().label()) {
            invoke
                .resolver
                .reject("Browser preview content cannot access application commands.");
            return true;
        }
        handler(invoke)
    }
}
