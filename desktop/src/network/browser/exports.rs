use std::{
    path::{Component, Path, PathBuf},
    sync::Mutex,
};
use tauri::Webview;
use tauri_plugin_fs::FsExt;
use tauri_plugin_opener::OpenerExt;
use url::Url;

use super::policy::{preview_url, require_editor};

static EXPORTS: Mutex<Vec<PathBuf>> = Mutex::new(Vec::new());

fn export_path(path: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute()
        || path.components().any(|part| matches!(part, Component::Normal(name) if name.to_string_lossy().starts_with('.')))
        || !path
            .extension()
            .is_some_and(|extension| extension.eq_ignore_ascii_case("html"))
    {
        return Err("Choose an exported HTML file.".into());
    }
    let metadata =
        std::fs::symlink_metadata(path).map_err(|_| "The HTML export is unavailable.")?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Choose a regular HTML export file.".into());
    }
    let canonical = path
        .canonicalize()
        .map_err(|_| "The HTML export is unavailable.")?;
    if canonical.components().any(
        |part| matches!(part, Component::Normal(name) if name.to_string_lossy().starts_with('.')),
    ) {
        return Err("Choose a visible HTML export file.".into());
    }
    Ok(canonical)
}

fn export_location(input: &str) -> Result<(PathBuf, Url), String> {
    let original = input
        .starts_with("file:")
        .then(|| Url::parse(input).map_err(|_| "The HTML export address is invalid."))
        .transpose()?;
    let candidate = match &original {
        Some(url) => url
            .to_file_path()
            .map_err(|_| "Choose a local HTML export.".to_owned())?,
        None => PathBuf::from(input),
    };
    let path = export_path(&candidate)?;
    let mut url = Url::from_file_path(&path).map_err(|_| "The HTML export address is invalid.")?;
    if let Some(original) = original {
        url.set_query(original.query());
        url.set_fragment(original.fragment());
    }
    Ok((path, url))
}

#[tauri::command]
pub fn authorize_browser_export(
    app: tauri::AppHandle,
    webview: Webview,
    path: String,
) -> Result<String, String> {
    require_editor(webview.label())?;
    let (path, url) = export_location(&path)?;
    if app.fs_scope().is_forbidden(&path) {
        return Err("This export location cannot be previewed.".into());
    }
    let mut exports = EXPORTS
        .lock()
        .map_err(|_| "Export preview is temporarily unavailable.")?;
    if !exports.contains(&path) {
        exports.push(path);
    }
    Ok(url.to_string())
}

#[tauri::command]
pub fn browser_preview_open_export(
    app: tauri::AppHandle,
    webview: Webview,
    url: String,
    folder: bool,
) -> Result<(), String> {
    require_editor(webview.label())?;
    let url = target(&url, app.config().build.dev_url.as_ref())?;
    if url.scheme() != "file" {
        return Err("Choose an exported HTML file.".into());
    }
    let path = export_path(
        &url.to_file_path()
            .map_err(|_| "The export path is invalid.")?,
    )?;
    if app.fs_scope().is_forbidden(&path) {
        return Err("This export location cannot be opened.".into());
    }
    if folder {
        app.opener().reveal_item_in_dir(path)
    } else {
        let url = Url::from_file_path(path).map_err(|_| "The export address is invalid.")?;
        app.opener().open_url(url.as_str(), None::<&str>)
    }
    .map_err(|error| error.to_string())
}

pub(super) fn target(input: &str, dev_url: Option<&Url>) -> Result<Url, String> {
    if let Ok(url) = preview_url(input, dev_url) {
        return Ok(url);
    }
    let url = Url::parse(input).map_err(|_| "Enter a full HTTP or HTTPS address.")?;
    if url.scheme() != "file" {
        return preview_url(input, dev_url);
    }
    let path = url
        .to_file_path()
        .map_err(|_| "This page cannot be previewed.")?;
    let path = export_path(&path)?;
    if EXPORTS
        .lock()
        .map_err(|_| "Export preview is temporarily unavailable.")?
        .contains(&path)
    {
        Ok(url)
    } else {
        Err("Open this HTML file through Code export first.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ordinary_web_rules_do_not_grant_local_files() {
        assert!(target("https://example.com/", None).is_ok());
        for url in [
            "file:///etc/passwd",
            "data:text/html,test",
            "tauri://localhost",
            "https://tauri.localhost/",
        ] {
            assert!(target(url, None).is_err(), "{url}");
        }
    }

    #[test]
    fn only_regular_absolute_html_exports_are_eligible() {
        let unique = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "open-pen-export-policy-{}-{unique}.html",
            std::process::id()
        ));
        std::fs::write(&path, "<!doctype html><p>owned export</p>").unwrap();
        assert!(export_path(&path).is_ok());
        assert!(export_path(Path::new("relative.html")).is_err());
        assert!(export_path(&path.with_file_name(".private-export.html")).is_err());
        assert!(export_path(&path.with_extension("pen")).is_err());
        let url = Url::from_file_path(&path).unwrap();
        assert!(target(url.as_str(), None).is_err());
        let canonical = export_path(&path).unwrap();
        assert_eq!(
            export_location(path.to_str().unwrap()).unwrap().0,
            canonical
        );
        let mut history_url = url.clone();
        history_url.set_query(Some("fixture=1"));
        history_url.set_fragment(Some("owned"));
        let (reopened, address) = export_location(history_url.as_str()).unwrap();
        assert_eq!(reopened, canonical);
        assert_eq!(address.query(), Some("fixture=1"));
        assert_eq!(address.fragment(), Some("owned"));
        assert!(export_location("file://remote/export.html").is_err());
        EXPORTS.lock().unwrap().push(canonical.clone());
        assert!(target(url.as_str(), None).is_ok());
        EXPORTS.lock().unwrap().retain(|path| path != &canonical);
        assert!(target(url.as_str(), None).is_err());
        #[cfg(unix)]
        {
            let link = path.with_file_name(format!("open-pen-export-link-{unique}.html"));
            std::os::unix::fs::symlink(&path, &link).unwrap();
            assert!(export_path(&link).is_err());
            std::fs::remove_file(link).unwrap();
            let hidden = path.with_file_name(format!(".open-pen-export-policy-{unique}"));
            let alias = path.with_file_name(format!("open-pen-export-alias-{unique}"));
            std::fs::create_dir(&hidden).unwrap();
            std::fs::write(hidden.join("output.html"), "owned export").unwrap();
            std::os::unix::fs::symlink(&hidden, &alias).unwrap();
            assert!(export_path(&alias.join("output.html")).is_err());
            std::fs::remove_file(alias).unwrap();
            std::fs::remove_file(hidden.join("output.html")).unwrap();
            std::fs::remove_dir(hidden).unwrap();
        }
        std::fs::remove_file(path).unwrap();
    }
}
