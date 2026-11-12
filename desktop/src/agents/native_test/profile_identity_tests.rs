use super::validate_active_profile;
use crate::agents::native_test::profile::load_profile;
use crate::agents::native_test::profile_context::apply_profile;
use crate::agents::native_test::profile_fixtures::{isolated_config, OwnedProfile};
use tauri::utils::config::AppDirectoriesOverride;

#[test]
fn readback_requires_the_exact_active_store_and_app_data_root() {
    let fixture = OwnedProfile::new();
    let profile = load_profile(&fixture.path, &fixture.root).unwrap();
    let mut config = isolated_config();
    apply_profile(&mut config, &profile, true).unwrap();
    assert!(validate_active_profile(&config, &profile, &profile.data_root).is_ok());
    assert!(validate_active_profile(&config, &profile, &fixture.root).is_err());
    config.app.windows[0].data_store_identifier = Some([99; 16]);
    assert!(validate_active_profile(&config, &profile, &profile.data_root).is_err());
}

#[test]
fn readback_refuses_ephemeral_production_or_reconfigured_hosts() {
    let fixture = OwnedProfile::new();
    let profile = load_profile(&fixture.path, &fixture.root).unwrap();
    let mut config = isolated_config();
    assert!(validate_active_profile(&config, &profile, &profile.data_root).is_err());
    apply_profile(&mut config, &profile, true).unwrap();
    let active = config.clone();
    config.identifier = "dev.jpoindexter.openpen".into();
    assert!(validate_active_profile(&config, &profile, &profile.data_root).is_err());
    config = active.clone();
    config.app.windows[0].incognito = true;
    assert!(validate_active_profile(&config, &profile, &profile.data_root).is_err());
    config = active.clone();
    config.app.windows.push(config.app.windows[0].clone());
    assert!(validate_active_profile(&config, &profile, &profile.data_root).is_err());
    config = active;
    config.app.app_directories_override = Some(AppDirectoriesOverride::Root(fixture.root.clone()));
    assert!(validate_active_profile(&config, &profile, &profile.data_root).is_err());
}
