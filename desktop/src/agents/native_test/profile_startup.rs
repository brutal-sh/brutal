use super::profile::{load_profile, prepare_data_root, RecoveryProfile};
use super::profile_args::profile_argument;
use super::profile_context::{apply_profile, validate_context, validate_test_host};
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use tauri::utils::config::Config;
use tauri::Manager;

pub(crate) fn activate_profile(
    config: &mut Config,
    args: impl IntoIterator<Item = OsString>,
    expected_root: Option<&Path>,
    supported: bool,
) -> Result<Option<RecoveryProfile>, String> {
    let Some(path) = profile_argument(args)? else {
        return Ok(None);
    };
    validate_context(config, supported)?;
    let root =
        expected_root.ok_or("Native recovery persistence requires the runner's MCP directory.")?;
    let profile = load_profile(&path, root)?;
    let mut next = config.clone();
    apply_profile(&mut next, &profile, supported)?;
    prepare_data_root(&profile)?;
    *config = next;
    Ok(Some(profile))
}

fn supports_persistence() -> bool {
    #[cfg(target_os = "macos")]
    {
        objc2::available!(macos = 14.0)
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

pub(crate) fn configure_context<R: tauri::Runtime>(
    mut context: tauri::Context<R>,
) -> Result<tauri::Context<R>, String> {
    validate_test_host(context.config())?;
    let root = std::env::var_os("OPENPENCIL_NATIVE_TEST_DIRECTORY").map(PathBuf::from);
    activate_profile(
        context.config_mut(),
        std::env::args_os().skip(1),
        root.as_deref(),
        supports_persistence(),
    )?;
    Ok(context)
}

pub(crate) fn build_profile_window(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window = app
        .config()
        .app
        .windows
        .first()
        .ok_or("Missing test window.")?;
    let Some(store_id) = window.data_store_identifier else {
        return Ok(());
    };
    if window.create || window.label != "main" || app.get_webview_window("main").is_some() {
        return Err("Persistent test window must be constructed exactly once.".into());
    }
    // Tauri 2.12.1 drops the store ID in from_config; keep the setter until the A/B control passes without it.
    tauri::WebviewWindowBuilder::from_config(app, window)?
        .data_store_identifier(store_id)
        .build()?;
    Ok(())
}

#[cfg(test)]
#[path = "profile_startup_tests.rs"]
mod tests;
