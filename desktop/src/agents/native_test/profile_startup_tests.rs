use super::{activate_profile, configure_context};
use crate::agents::native_test::profile_args::PROFILE_FLAG;
use crate::agents::native_test::profile_fixtures::{isolated_config, OwnedProfile};
use std::ffi::OsString;
use std::fs;

fn args(fixture: &OwnedProfile) -> [OsString; 1] {
    [OsString::from(format!(
        "{PROFILE_FLAG}={}",
        fixture.path.display()
    ))]
}

#[test]
fn the_generated_native_test_context_stays_ephemeral_without_a_profile_flag() {
    let mut context = crate::app_context();
    *context.config_mut() = isolated_config();
    let original = serde_json::to_value(context.config()).unwrap();
    let checked = configure_context(context).unwrap();
    assert_eq!(serde_json::to_value(checked.config()).unwrap(), original);
}

#[test]
fn the_generated_production_context_is_refused_by_the_native_test_wrapper() {
    let mut context = crate::app_context();
    context.config_mut().identifier = "dev.jpoindexter.openpen".into();
    assert!(configure_context(context).is_err());
}

#[test]
fn no_profile_request_keeps_even_a_production_configuration_unchanged() {
    let mut config = isolated_config();
    config.identifier = "dev.jpoindexter.openpen".into();
    config.app.windows[0].incognito = false;
    let original = serde_json::to_value(&config).unwrap();
    assert_eq!(
        activate_profile(&mut config, Vec::new(), None, false).unwrap(),
        None
    );
    assert_eq!(serde_json::to_value(config).unwrap(), original);
}

#[test]
fn configured_test_routing_alone_does_not_read_a_marker_or_enable_persistence() {
    let fixture = OwnedProfile::new();
    fs::write(&fixture.path, "invalid marker").unwrap();
    let mut config = isolated_config();
    let original = serde_json::to_value(&config).unwrap();
    assert_eq!(
        activate_profile(&mut config, Vec::new(), Some(&fixture.root), false).unwrap(),
        None
    );
    assert_eq!(serde_json::to_value(config).unwrap(), original);
    assert!(!fixture.root.join("profile-data").exists());
}

#[test]
fn explicit_supported_activation_creates_private_app_data_and_retains_reentry_data() {
    let fixture = OwnedProfile::new();
    let mut config = isolated_config();
    let first = activate_profile(&mut config, args(&fixture), Some(&fixture.root), true)
        .unwrap()
        .unwrap();
    assert!(first.data_root.is_dir());
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            fs::metadata(&first.data_root).unwrap().permissions().mode() & 0o777,
            0o700
        );
    }
    fs::write(first.data_root.join("retained.txt"), "test-owned state").unwrap();
    let mut next = isolated_config();
    let second = activate_profile(&mut next, args(&fixture), Some(&fixture.root), true)
        .unwrap()
        .unwrap();
    assert_eq!(first, second);
    assert_eq!(
        fs::read_to_string(second.data_root.join("retained.txt")).unwrap(),
        "test-owned state"
    );
    assert_eq!(
        serde_json::to_value(config).unwrap(),
        serde_json::to_value(next).unwrap()
    );
}

#[test]
fn missing_routing_and_unsupported_platform_leave_config_and_app_paths_untouched() {
    let fixture = OwnedProfile::new();
    for supported in [true, false] {
        let mut config = isolated_config();
        let original = serde_json::to_value(&config).unwrap();
        let root = if supported {
            None
        } else {
            Some(fixture.root.as_path())
        };
        assert!(activate_profile(&mut config, args(&fixture), root, supported).is_err());
        assert_eq!(serde_json::to_value(config).unwrap(), original);
        assert!(!fixture.root.join("profile-data").exists());
    }
}

#[test]
fn invalid_marker_cannot_change_configuration_or_create_app_data() {
    let fixture = OwnedProfile::new();
    fs::write(&fixture.path, "invalid marker").unwrap();
    let mut config = isolated_config();
    let original = serde_json::to_value(&config).unwrap();
    assert!(activate_profile(&mut config, args(&fixture), Some(&fixture.root), true).is_err());
    assert_eq!(serde_json::to_value(config).unwrap(), original);
    assert!(!fixture.root.join("profile-data").exists());
}

#[test]
fn duplicate_flags_cannot_change_configuration_or_create_app_data() {
    let fixture = OwnedProfile::new();
    let mut config = isolated_config();
    let original = serde_json::to_value(&config).unwrap();
    let duplicate = [args(&fixture)[0].clone(), args(&fixture)[0].clone()];
    assert!(activate_profile(&mut config, duplicate, Some(&fixture.root), true).is_err());
    assert_eq!(serde_json::to_value(config).unwrap(), original);
    assert!(!fixture.root.join("profile-data").exists());
}
