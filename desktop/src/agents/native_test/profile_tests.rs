use super::load_profile;
use crate::agents::native_test::profile_fixtures::{OwnedProfile, VALID_MARKER};
use std::fs;

#[test]
fn valid_owned_profile_derives_only_its_private_app_directory() {
    let fixture = OwnedProfile::new();
    let profile = load_profile(&fixture.path, &fixture.root).unwrap();
    assert_eq!(
        profile.store_id,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
    );
    assert_eq!(
        profile.data_root,
        fixture.root.canonicalize().unwrap().join("profile-data")
    );
    assert!(!profile.data_root.exists());
}

#[test]
fn reopening_the_same_owned_profile_retains_the_same_store_identity() {
    let fixture = OwnedProfile::new();
    let first = load_profile(&fixture.path, &fixture.root).unwrap();
    let reopened = load_profile(&fixture.path, &fixture.root).unwrap();
    assert_eq!(first, reopened);
}

#[test]
fn another_run_directory_cannot_authorize_this_profile() {
    let first = OwnedProfile::new();
    let second = OwnedProfile::new();
    assert!(load_profile(&first.path, &second.root).is_err());
}

#[test]
fn relative_and_wrong_marker_paths_are_refused() {
    let fixture = OwnedProfile::new();
    assert!(load_profile(std::path::Path::new("recovery-profile.json"), &fixture.root).is_err());
    let other = fixture.root.join("unrelated.json");
    fs::copy(&fixture.path, &other).unwrap();
    assert!(load_profile(&other, &fixture.root).is_err());
}

#[test]
fn malformed_wrong_version_unknown_fields_and_invalid_store_ids_are_refused() {
    let fixture = OwnedProfile::new();
    for body in [
        "{",
        r#"{"version":2,"storeId":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]}"#,
        r#"{"version":1,"storeId":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}"#,
        r#"{"version":1,"storeId":[1,2]}"#,
        r#"{"version":1,"storeId":[256,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]}"#,
        r#"{"version":1,"storeId":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],"appData":"/tmp"}"#,
    ] {
        fs::write(&fixture.path, body).unwrap();
        assert!(load_profile(&fixture.path, &fixture.root).is_err());
    }
}

#[test]
fn missing_directory_marker_and_oversized_marker_are_refused() {
    let fixture = OwnedProfile::new();
    fs::remove_file(&fixture.path).unwrap();
    assert!(load_profile(&fixture.path, &fixture.root).is_err());
    fs::create_dir(&fixture.path).unwrap();
    assert!(load_profile(&fixture.path, &fixture.root).is_err());
    fs::remove_dir(&fixture.path).unwrap();
    let mut oversized = vec![b' '; 4097];
    oversized.extend_from_slice(VALID_MARKER.as_bytes());
    fs::write(&fixture.path, oversized).unwrap();
    assert!(load_profile(&fixture.path, &fixture.root).is_err());
}

#[cfg(unix)]
#[test]
fn profile_and_data_directory_symlinks_are_refused() {
    use std::os::unix::fs::symlink;
    let fixture = OwnedProfile::new();
    let other = OwnedProfile::new();
    fs::remove_file(&fixture.path).unwrap();
    symlink(&other.path, &fixture.path).unwrap();
    assert!(load_profile(&fixture.path, &fixture.root).is_err());
    fs::remove_file(&fixture.path).unwrap();
    fs::copy(&other.path, &fixture.path).unwrap();
    symlink(&other.root, fixture.root.join("profile-data")).unwrap();
    assert!(load_profile(&fixture.path, &fixture.root).is_err());
}

#[test]
fn an_existing_private_app_directory_is_retained_without_mutating_it() {
    let fixture = OwnedProfile::new();
    let data = fixture.root.join("profile-data");
    fs::create_dir(&data).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&data, fs::Permissions::from_mode(0o700)).unwrap();
    }
    fs::write(data.join("retained.txt"), "owned previous launch").unwrap();
    let profile = load_profile(&fixture.path, &fixture.root).unwrap();
    assert_eq!(profile.data_root, data.canonicalize().unwrap());
    assert_eq!(
        fs::read_to_string(data.join("retained.txt")).unwrap(),
        "owned previous launch"
    );
}

#[test]
fn a_nested_directory_is_not_a_runner_root() {
    let fixture = OwnedProfile::new();
    let nested = fixture.root.join("openpen-native-test-nested");
    fs::create_dir(&nested).unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&nested, fs::Permissions::from_mode(0o700)).unwrap();
    }
    let marker = nested.join("recovery-profile.json");
    fs::copy(&fixture.path, &marker).unwrap();
    assert!(load_profile(&marker, &nested).is_err());
}

#[cfg(unix)]
#[test]
fn a_public_root_or_marker_cannot_enable_persistence() {
    use std::os::unix::fs::PermissionsExt;
    let fixture = OwnedProfile::new();
    fs::set_permissions(&fixture.root, fs::Permissions::from_mode(0o755)).unwrap();
    assert!(load_profile(&fixture.path, &fixture.root).is_err());
    fs::set_permissions(&fixture.root, fs::Permissions::from_mode(0o700)).unwrap();
    fs::set_permissions(&fixture.path, fs::Permissions::from_mode(0o644)).unwrap();
    assert!(load_profile(&fixture.path, &fixture.root).is_err());
}
