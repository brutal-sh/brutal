use std::fs::{self, File, Metadata};
use std::io::Read;
use std::path::{Path, PathBuf};

const MARKER_NAME: &str = "recovery-profile.json";
const MAX_MARKER_BYTES: u64 = 4096;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProfileMarker {
    version: u8,
    store_id: [u8; 16],
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct RecoveryProfile {
    pub store_id: [u8; 16],
    pub data_root: PathBuf,
}

fn private_metadata(path: &Path, directory: bool) -> Result<Metadata, String> {
    let metadata = fs::symlink_metadata(path).map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink()
        || (directory && !metadata.is_dir())
        || (!directory && !metadata.is_file())
    {
        return Err("Native recovery profile paths must be regular, not symbolic links.".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if metadata.permissions().mode() & 0o077 != 0 {
            return Err("Native recovery profile paths must be private to the test runner.".into());
        }
    }
    Ok(metadata)
}

fn checked_root(path: &Path, expected_root: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute() || !expected_root.is_absolute() {
        return Err("Native recovery profile paths must be absolute.".into());
    }
    private_metadata(expected_root, true)?;
    let parent = path
        .parent()
        .ok_or("Native recovery profile has no parent.")?;
    private_metadata(parent, true)?;
    let root = expected_root
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let temp = std::env::temp_dir()
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if parent.canonicalize().map_err(|error| error.to_string())? != root
        || root.parent() != Some(temp.as_path())
        || !root
            .file_name()
            .is_some_and(|name| name.to_string_lossy().starts_with("openpen-native-test-"))
        || path.file_name() != Some(std::ffi::OsStr::new(MARKER_NAME))
    {
        return Err(
            "Native recovery profile must belong to this test runner's temporary root.".into(),
        );
    }
    Ok(root)
}

fn read_marker(path: &Path) -> Result<ProfileMarker, String> {
    if private_metadata(path, false)?.len() > MAX_MARKER_BYTES {
        return Err("Native recovery profile marker is too large.".into());
    }
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(|error| error.to_string())?
        .take(MAX_MARKER_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    if bytes.len() as u64 > MAX_MARKER_BYTES {
        return Err("Native recovery profile marker is too large.".into());
    }
    let marker: ProfileMarker =
        serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
    if marker.version != 1 || marker.store_id.iter().all(|byte| *byte == 0) {
        return Err(
            "Native recovery profile requires version 1 and a nonzero store identity.".into(),
        );
    }
    Ok(marker)
}

pub(crate) fn load_profile(path: &Path, expected_root: &Path) -> Result<RecoveryProfile, String> {
    let root = checked_root(path, expected_root)?;
    let marker = read_marker(path)?;
    let data_root = root.join("profile-data");
    match fs::symlink_metadata(&data_root) {
        Ok(_) => {
            private_metadata(&data_root, true)?;
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.to_string()),
    }
    Ok(RecoveryProfile {
        store_id: marker.store_id,
        data_root,
    })
}

pub(super) fn prepare_data_root(profile: &RecoveryProfile) -> Result<(), String> {
    let parent = profile
        .data_root
        .parent()
        .ok_or("Native profile has no app-data parent.")?;
    private_metadata(parent, true)?;
    let mut directory = fs::DirBuilder::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        directory.mode(0o700);
    }
    match directory.create(&profile.data_root) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(error) => return Err(error.to_string()),
    }
    private_metadata(&profile.data_root, true)?;
    Ok(())
}

#[cfg(test)]
#[path = "profile_tests.rs"]
mod tests;
