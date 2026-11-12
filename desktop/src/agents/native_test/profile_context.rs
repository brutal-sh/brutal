use super::profile::RecoveryProfile;
use tauri::utils::config::{AppDirectoriesOverride, Config};

pub(crate) const TEST_IDENTIFIER: &str = "dev.jpoindexter.openpen.native-test";

pub(super) fn validate_context(config: &Config, supported: bool) -> Result<(), String> {
    if !supported {
        return Err("Native recovery persistence requires macOS 14 or newer.".into());
    }
    validate_test_host(config)
}

pub(super) fn validate_test_host(config: &Config) -> Result<(), String> {
    if config.identifier != TEST_IDENTIFIER
        || config.app.windows.len() != 1
        || config.app.app_directories_override.is_some()
    {
        return Err("Native recovery persistence requires the isolated test configuration.".into());
    }
    let window = &config.app.windows[0];
    if window.label != "main"
        || !window.incognito
        || window.data_store_identifier.is_some()
        || window.data_directory.is_some()
    {
        return Err(
            "Native recovery persistence requires the original ephemeral main window.".into(),
        );
    }
    Ok(())
}

pub(crate) fn apply_profile(
    config: &mut Config,
    profile: &RecoveryProfile,
    supported: bool,
) -> Result<(), String> {
    validate_context(config, supported)?;
    let window = &mut config.app.windows[0];
    window.data_store_identifier = Some(profile.store_id);
    window.incognito = false;
    config.app.app_directories_override =
        Some(AppDirectoriesOverride::Root(profile.data_root.clone()));
    Ok(())
}

#[cfg(test)]
#[path = "profile_context_tests.rs"]
mod tests;
