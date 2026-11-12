use super::{apply_profile, validate_test_host, TEST_IDENTIFIER};
use crate::agents::native_test::profile::RecoveryProfile;
use crate::agents::native_test::profile_fixtures::isolated_config;
use std::path::PathBuf;
use tauri::utils::config::{AppDirectoriesOverride, WindowConfig};

fn profile() -> RecoveryProfile {
    RecoveryProfile {
        store_id: [1; 16],
        data_root: PathBuf::from("/test-owned/profile-data"),
    }
}

#[test]
fn the_ordinary_ephemeral_native_test_host_passes_the_startup_preflight() {
    assert!(validate_test_host(&isolated_config()).is_ok());
}

#[test]
fn a_native_test_build_cannot_use_production_identity_even_without_a_profile_request() {
    let mut config = isolated_config();
    config.identifier = "dev.jpoindexter.openpen".into();
    assert!(validate_test_host(&config).is_err());
}

#[test]
fn supported_test_configuration_selects_only_the_owned_store_and_app_paths() {
    let mut config = isolated_config();
    let profile = profile();
    let original = config.clone();
    apply_profile(&mut config, &profile, true).unwrap();
    assert_eq!(config.identifier, TEST_IDENTIFIER);
    assert_eq!(
        config.app.windows[0].data_store_identifier,
        Some(profile.store_id)
    );
    assert!(!config.app.windows[0].incognito);
    assert!(!config.app.windows[0].create);
    assert_eq!(
        config.app.app_directories_override,
        Some(AppDirectoriesOverride::Root(profile.data_root))
    );
    let mut expected = original;
    expected.app.windows[0].data_store_identifier = config.app.windows[0].data_store_identifier;
    expected.app.windows[0].incognito = false;
    expected.app.windows[0].create = false;
    expected.app.app_directories_override = config.app.app_directories_override.clone();
    assert_eq!(
        serde_json::to_value(config).unwrap(),
        serde_json::to_value(expected).unwrap()
    );
}

#[test]
fn unsupported_platform_is_refused_without_mutating_configuration() {
    let mut config = isolated_config();
    let original = serde_json::to_value(&config).unwrap();
    assert!(apply_profile(&mut config, &profile(), false).is_err());
    assert_eq!(serde_json::to_value(config).unwrap(), original);
}

#[test]
fn production_identifier_cannot_activate_a_persistent_profile() {
    let mut config = isolated_config();
    config.identifier = "dev.jpoindexter.openpen".into();
    let original = serde_json::to_value(&config).unwrap();
    assert!(apply_profile(&mut config, &profile(), true).is_err());
    assert_eq!(serde_json::to_value(config).unwrap(), original);
}

#[test]
fn an_unexpected_or_already_persistent_window_is_refused() {
    for mutation in [
        "missing",
        "extra",
        "other-label",
        "not-incognito",
        "not-created",
        "existing-store",
        "existing-data-directory",
        "existing-paths",
    ] {
        let mut config = isolated_config();
        match mutation {
            "missing" => config.app.windows.clear(),
            "extra" => config.app.windows.push(WindowConfig::default()),
            "other-label" => config.app.windows[0].label = "other".into(),
            "not-incognito" => config.app.windows[0].incognito = false,
            "not-created" => config.app.windows[0].create = false,
            "existing-store" => config.app.windows[0].data_store_identifier = Some([2; 16]),
            "existing-data-directory" => {
                config.app.windows[0].data_directory = Some(PathBuf::from("/other"))
            }
            "existing-paths" => {
                config.app.app_directories_override =
                    Some(AppDirectoriesOverride::Root(PathBuf::from("/other")))
            }
            _ => unreachable!(),
        }
        let original = serde_json::to_value(&config).unwrap();
        assert!(apply_profile(&mut config, &profile(), true).is_err());
        assert_eq!(serde_json::to_value(config).unwrap(), original);
    }
}
