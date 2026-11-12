use super::{profile_argument, PROFILE_FLAG};
use std::ffi::OsString;

#[test]
fn unrelated_arguments_do_not_request_a_persistent_profile() {
    let args = ["--other", "document.pen"].map(OsString::from);
    assert_eq!(profile_argument(args).unwrap(), None);
    assert_eq!(profile_argument(Vec::<OsString>::new()).unwrap(), None);
}

#[test]
fn one_absolute_profile_marker_is_selected_without_shell_expansion() {
    let path = std::env::temp_dir().join("owned profile/recovery-profile.json");
    let flag = OsString::from(format!("{PROFILE_FLAG}={}", path.display()));
    assert_eq!(profile_argument([flag]).unwrap(), Some(path));
}

#[test]
fn duplicate_profile_arguments_are_refused() {
    let path = std::env::temp_dir().join("recovery-profile.json");
    let flag = OsString::from(format!("{PROFILE_FLAG}={}", path.display()));
    assert!(profile_argument([flag.clone(), flag]).is_err());
}

#[test]
fn recognized_flags_with_missing_relative_or_malformed_values_are_refused() {
    for flag in [
        PROFILE_FLAG.to_string(),
        format!("{PROFILE_FLAG}="),
        format!("{PROFILE_FLAG}=relative/recovery-profile.json"),
        format!("{PROFILE_FLAG}-typo=/unused"),
    ] {
        assert!(profile_argument([OsString::from(flag)]).is_err());
    }
}

#[cfg(unix)]
#[test]
fn an_invalid_unicode_profile_flag_is_refused_but_unrelated_arguments_are_untouched() {
    use std::os::unix::ffi::OsStringExt;
    let mut flag = format!("{PROFILE_FLAG}=").into_bytes();
    flag.push(0xff);
    assert!(profile_argument([OsString::from_vec(flag)]).is_err());
    assert_eq!(
        profile_argument([OsString::from_vec(vec![0xff])]).unwrap(),
        None
    );
}
