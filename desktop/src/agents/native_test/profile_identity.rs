use super::profile::{load_profile, RecoveryProfile};
use super::profile_args::profile_argument;
use super::profile_context::TEST_IDENTIFIER;
use std::path::{Path, PathBuf};
use tauri::utils::config::{AppDirectoriesOverride, Config};
use tauri::Manager;

pub(super) fn validate_active_profile(
    config: &Config,
    profile: &RecoveryProfile,
    app_data: &Path,
) -> Result<(), String> {
    if config.identifier != TEST_IDENTIFIER || config.app.windows.len() != 1 {
        return Err("Recovery identity requires the isolated test host.".into());
    }
    let window = &config.app.windows[0];
    if window.label != "main"
        || window.incognito
        || window.data_directory.is_some()
        || window.data_store_identifier != Some(profile.store_id)
        || config.app.app_directories_override
            != Some(AppDirectoriesOverride::Root(profile.data_root.clone()))
        || app_data != profile.data_root
    {
        return Err("Recovery identity does not match the active isolated store.".into());
    }
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeRecoveryIdentity {
    pid: u32,
    executable: PathBuf,
    marker: PathBuf,
    root: PathBuf,
    store_id: [u8; 16],
    app_data: PathBuf,
}

#[tauri::command]
pub fn native_test_recovery_identity(
    webview: tauri::Webview,
) -> Result<NativeRecoveryIdentity, String> {
    if webview.label() != "main" {
        return Err("Recovery identity is editor-only.".into());
    }
    let root = std::env::var_os("OPENPENCIL_NATIVE_TEST_DIRECTORY")
        .map(PathBuf::from)
        .ok_or("Recovery identity requires the runner's directory.")?;
    let marker = profile_argument(std::env::args_os().skip(1))?
        .ok_or("Recovery identity requires an explicit persistent profile.")?;
    let profile = load_profile(&marker, &root)?;
    let app = webview.app_handle();
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    validate_active_profile(app.config(), &profile, &app_data)?;
    Ok(NativeRecoveryIdentity {
        pid: std::process::id(),
        executable: std::env::current_exe().map_err(|error| error.to_string())?,
        marker: marker.canonicalize().map_err(|error| error.to_string())?,
        root: root.canonicalize().map_err(|error| error.to_string())?,
        store_id: profile.store_id,
        app_data,
    })
}

#[cfg(test)]
#[path = "profile_identity_tests.rs"]
mod tests;
