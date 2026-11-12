use super::profile_context::TEST_IDENTIFIER;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::utils::config::{Config, WindowConfig};

static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);
pub(crate) const VALID_MARKER: &str =
    r#"{"version":1,"storeId":[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]}"#;

pub(crate) struct OwnedProfile {
    pub root: PathBuf,
    pub path: PathBuf,
}

impl OwnedProfile {
    pub fn new() -> Self {
        let root = std::env::temp_dir().join(format!(
            "openpen-native-test-profile-{}-{}",
            std::process::id(),
            NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&root).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700)).unwrap();
        }
        let path = root.join("recovery-profile.json");
        fs::write(&path, VALID_MARKER).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
        }
        Self { root, path }
    }
}

impl Drop for OwnedProfile {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.root).unwrap();
    }
}

pub(crate) fn isolated_config() -> Config {
    let mut config = Config::default();
    config.identifier = TEST_IDENTIFIER.into();
    config.app.windows = vec![WindowConfig {
        label: "main".into(),
        incognito: true,
        ..WindowConfig::default()
    }];
    config
}
