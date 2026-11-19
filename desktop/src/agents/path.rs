//! The `PATH` agents and companions are found and started with.

#[cfg(target_os = "macos")]
use std::path::Path;
use std::path::PathBuf;

/// Directories that commonly hold a globally installed Node/Bun CLI.
///
/// GUI launches inherit launchd's minimal `PATH`, so a package installed by
/// npm, Bun, Volta, or Homebrew can be invisible even though the user's shell
/// finds it. `fix_path_env::fix()` reads the login shell first; these entries
/// cover managers that only modify an interactive rc file.
pub fn candidate_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();
    // Bun, Volta, and npm keep their Windows folders under USERPROFILE, which `home_dir` reads
    // there instead of a HOME set by Unix-style tools.
    if let Some(home) = std::env::home_dir() {
        dirs.push(home.join(".bun/bin"));
        dirs.push(home.join(".local/bin"));
        dirs.push(home.join(".npm-global/bin"));
        dirs.push(home.join(".volta/bin"));
        dirs.push(home.join("n/bin"));
        dirs.push(home.join(".local/share/mise/shims"));
    }
    #[cfg(target_os = "macos")]
    {
        dirs.push(PathBuf::from("/opt/homebrew/bin"));
        dirs.push(PathBuf::from("/usr/local/bin"));
        dirs.push(PathBuf::from("/opt/local/bin"));
    }
    #[cfg(target_os = "linux")]
    {
        dirs.push(PathBuf::from("/usr/local/bin"));
        dirs.push(PathBuf::from("/home/linuxbrew/.linuxbrew/bin"));
    }
    #[cfg(windows)]
    {
        if let Some(appdata) = std::env::var_os("APPDATA").map(PathBuf::from) {
            dirs.push(appdata.join("npm"));
        }
    }
    dirs
}

/// Existing candidate directories, most specific first, for diagnostics.
pub fn search_dirs() -> Vec<PathBuf> {
    candidate_dirs()
        .into_iter()
        .filter(|dir| dir.is_dir())
        .collect()
}

/// Append candidate directories that the current process `PATH` is missing.
pub fn augment_path(path: &str, candidates: &[PathBuf]) -> String {
    let mut entries: Vec<PathBuf> = std::env::split_paths(path).collect();
    for candidate in candidates {
        if candidate.is_dir() && !entries.contains(candidate) {
            entries.push(candidate.clone());
        }
    }
    std::env::join_paths(entries)
        .map(|joined| joined.to_string_lossy().into_owned())
        .unwrap_or_else(|_| path.to_string())
}

#[cfg(target_os = "macos")]
fn bundled_bridge_dir(executable: &Path) -> Option<&Path> {
    let directory = executable.parent()?;
    let contents = directory.parent()?;
    let bundle = contents.parent()?;
    if directory.file_name()? != "MacOS"
        || contents.file_name()? != "Contents"
        || bundle.extension()? != "app"
        || !directory
            .join(super::mcp::MCP_EXECUTABLE)
            .symlink_metadata()
            .ok()?
            .is_file()
    {
        return None;
    }
    Some(directory)
}

#[cfg(target_os = "macos")]
fn prefer_bundled_bridge(path: &str, executable: &Path) -> String {
    let Some(directory) = bundled_bridge_dir(executable) else {
        return path.to_owned();
    };
    let installed = std::env::split_paths(path).filter(|entry| entry != directory);
    std::env::join_paths(std::iter::once(directory.to_path_buf()).chain(installed))
        .map(|joined| joined.to_string_lossy().into_owned())
        .unwrap_or_else(|_| path.to_owned())
}

/// Make globally installed CLIs visible to `which` and to spawned children.
pub fn augment_process_path() {
    let current = std::env::var("PATH").unwrap_or_default();
    let next = augment_path(&current, &candidate_dirs());
    // The bundled bridge has the editor's version. Use the same binary for
    // diagnostics and launch through the existing fixed-name shell permission.
    #[cfg(target_os = "macos")]
    let next = match std::env::current_exe() {
        Ok(executable) => prefer_bundled_bridge(&next, &executable),
        Err(_) => next,
    };
    if next != current {
        std::env::set_var("PATH", next);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn only_the_bridge_inside_the_app_takes_precedence() {
        use std::os::unix::fs::symlink;

        let fixture = std::env::temp_dir().join(format!("openpen-path-{}", std::process::id()));
        let directory = fixture.join("Open Pen.app/Contents/MacOS");
        std::fs::create_dir_all(&directory).unwrap();
        let executable = directory.join("OpenPencil");
        let bridge = directory.join(super::super::mcp::MCP_EXECUTABLE);
        let existing = "/usr/local/bin:/usr/bin";

        assert_eq!(prefer_bundled_bridge(existing, &executable), existing);
        let outside = fixture.join("external-bridge");
        std::fs::write(&outside, "").unwrap();
        symlink(&outside, &bridge).unwrap();
        assert_eq!(prefer_bundled_bridge(existing, &executable), existing);
        std::fs::remove_file(&bridge).unwrap();
        std::fs::write(&bridge, "").unwrap();

        let resolved = prefer_bundled_bridge(existing, &executable);
        assert_eq!(
            std::env::split_paths(&resolved).collect::<Vec<_>>(),
            [
                directory,
                PathBuf::from("/usr/local/bin"),
                PathBuf::from("/usr/bin")
            ]
        );
        assert_eq!(prefer_bundled_bridge(&resolved, &executable), resolved);
        assert_eq!(prefer_bundled_bridge(existing, &outside), existing);
        std::fs::remove_dir_all(fixture).unwrap();
    }

    #[test]
    fn augment_path_appends_missing_candidates_once() {
        let current_dir = std::env::temp_dir();
        let appended_dir = std::env::temp_dir().join("open-pencil-appended");
        std::fs::create_dir_all(&appended_dir).expect("create candidate dir");

        let current =
            std::env::join_paths([PathBuf::from("/open-pencil-first"), current_dir.clone()])
                .expect("join path list");
        let candidates = vec![current_dir.clone(), appended_dir.clone()];
        let entries: Vec<PathBuf> =
            std::env::split_paths(&augment_path(&current.to_string_lossy(), &candidates)).collect();

        // Existing entries keep their order and the missing candidate is
        // appended once, at the end.
        assert_eq!(
            entries,
            vec![
                PathBuf::from("/open-pencil-first"),
                current_dir,
                appended_dir.clone(),
            ]
        );

        let _ = std::fs::remove_dir(&appended_dir);
    }

    #[test]
    fn augment_path_ignores_candidates_that_do_not_exist() {
        let current =
            std::env::join_paths([PathBuf::from("/open-pencil-only")]).expect("join path list");
        let augmented = augment_path(
            &current.to_string_lossy(),
            &[PathBuf::from("/open-pencil-nonexistent")],
        );

        assert!(!augmented.contains("nonexistent"));
    }

    #[test]
    fn augment_path_keeps_an_existing_path_when_nothing_changes() {
        let current = std::env::var("PATH").unwrap_or_default();
        let augmented = augment_path(&current, &[]);
        assert_eq!(augmented, current);
    }
}
