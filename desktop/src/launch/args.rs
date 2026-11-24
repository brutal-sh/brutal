//! Documents and links a launch names in its arguments.

use std::path::{Path, PathBuf};

pub fn file_association_path(path: PathBuf) -> Option<PathBuf> {
    let path = path.canonicalize().ok()?;
    if !path.is_file() {
        return None;
    }
    let ext = path.extension()?.to_string_lossy().to_lowercase();
    matches!(
        ext.as_str(),
        "brut" | "fig" | "jam" | "pen" | "sketch" | "drawio" | "dio" | "mmd" | "mermaid"
    )
    .then_some(path)
}

fn path_from_arg(arg: String, cwd: &Path) -> Option<PathBuf> {
    if arg.starts_with('-') {
        return None;
    }

    if let Ok(url) = tauri::Url::parse(&arg) {
        if let Ok(path) = url.to_file_path() {
            return Some(path);
        }
    }

    let path = PathBuf::from(arg);
    Some(if path.is_absolute() {
        path
    } else {
        cwd.join(path)
    })
}

pub fn open_paths_from_args(args: Vec<String>, cwd: &Path) -> Vec<PathBuf> {
    args.into_iter()
        .filter_map(|arg| path_from_arg(arg, cwd))
        .filter_map(file_association_path)
        .collect()
}

/// `brutal://` URLs among a second launch's arguments: Windows and Linux start a new
/// process for a link, and the single-instance plugin hands its arguments to this one.
#[cfg(all(
    any(target_os = "macos", windows, target_os = "linux"),
    not(feature = "native-test")
))]
pub fn deep_links_from_args(args: &[String]) -> Vec<url::Url> {
    args.iter()
        .filter_map(|arg| url::Url::parse(arg).ok())
        .filter(super::links::is_app_link)
        .collect()
}

pub fn startup_open_paths() -> Vec<PathBuf> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    open_paths_from_args(std::env::args().skip(1).collect(), &cwd)
}

// Test-only profile arguments must never fall through to a normal app data store.
pub(crate) const NATIVE_PROFILE_FLAG: &str = "--open-pen-native-test-profile";

pub(crate) fn accepts_profile_arguments(
    native_test: bool,
    args: impl IntoIterator<Item = std::ffi::OsString>,
) -> bool {
    native_test
        || !args.into_iter().any(|arg| {
            arg.as_encoded_bytes()
                .starts_with(NATIVE_PROFILE_FLAG.as_bytes())
        })
}

#[cfg(test)]
mod tests {
    use super::{accepts_profile_arguments, NATIVE_PROFILE_FLAG};
    use std::ffi::OsString;

    #[test]
    fn normal_builds_refuse_reserved_recovery_profile_arguments_before_startup() {
        for flag in [
            NATIVE_PROFILE_FLAG.to_owned(),
            format!("{NATIVE_PROFILE_FLAG}=/tmp/test.json"),
            format!("{NATIVE_PROFILE_FLAG}-invalid"),
        ] {
            assert!(!accepts_profile_arguments(false, [OsString::from(&flag)]));
            assert!(accepts_profile_arguments(true, [OsString::from(&flag)]));
        }
        assert!(accepts_profile_arguments(
            false,
            [OsString::from("example.pen")]
        ));
        assert!(accepts_profile_arguments(false, Vec::new()));
    }
}
