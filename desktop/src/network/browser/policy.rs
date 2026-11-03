use url::Url;

pub const PREVIEW_LABEL: &str = "browser-preview";
pub const MAX_CAPTURE_BYTES: usize = 16 * 1024 * 1024;

/// This guard also covers a preview that somehow reaches a local application origin.
pub fn permits_app_command(label: &str) -> bool {
    label != PREVIEW_LABEL
}

pub fn require_editor(label: &str) -> Result<(), String> {
    if label == "main" {
        Ok(())
    } else {
        Err("Browser controls are available only in the editor.".into())
    }
}

pub fn preview_zoom(zoom: Option<f64>) -> Result<f64, String> {
    let zoom = zoom.unwrap_or(1.0);
    if zoom.is_finite() && (0.1..=8.0).contains(&zoom) {
        Ok(zoom)
    } else {
        Err("Choose an available browser zoom level.".into())
    }
}

pub fn preview_url(input: &str, dev_url: Option<&Url>) -> Result<Url, String> {
    let url = Url::parse(input.trim()).map_err(|_| "Enter a full HTTP or HTTPS address.")?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("Only HTTP and HTTPS pages can be previewed.".into());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("Remove credentials from the address.".into());
    }
    if url.host_str() == Some("tauri.localhost")
        || dev_url.is_some_and(|dev| dev.origin() == url.origin())
    {
        return Err("The editor cannot be opened as a preview.".into());
    }
    Ok(url)
}

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DockBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl DockBounds {
    pub fn validate(&self, window_width: f64, window_height: f64) -> Result<(), String> {
        if [self.x, self.y, self.width, self.height]
            .iter()
            .any(|n| !n.is_finite())
            || self.x < 0.0
            || self.y < 0.0
            || !(1.0..=1920.0).contains(&self.width)
            || !(1.0..=1200.0).contains(&self.height)
            || self.x + self.width > window_width + 1.0
            || self.y + self.height > window_height + 1.0
        {
            Err("The browser preview must fit inside its editor dock.".into())
        } else {
            Ok(())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn permits_web_pages_and_local_test_servers() {
        assert!(preview_url("https://example.com/path?q=1", None).is_ok());
        assert!(preview_url("http://127.0.0.1:45451/test", None).is_ok());
    }
    #[test]
    fn rejects_local_files_privileged_origins_and_embedded_credentials() {
        let dev = Url::parse("http://localhost:1420").unwrap();
        for input in [
            "file:///etc/passwd",
            "javascript:alert(1)",
            "data:text/html,test",
            "tauri://localhost",
            "https://tauri.localhost/",
            "http://localhost:1420/",
            "https://user:secret@example.com/",
        ] {
            assert!(preview_url(input, Some(&dev)).is_err(), "{input}");
        }
    }
    #[test]
    fn preview_cannot_invoke_app_commands_even_after_local_origin_navigation() {
        assert!(!permits_app_command(PREVIEW_LABEL));
        assert!(require_editor(PREVIEW_LABEL).is_err());
        assert!(require_editor("updater").is_err());
        assert!(require_editor("main").is_ok());
        assert!(permits_app_command("main"));
    }
    #[test]
    fn bounds_viewport_allocation() {
        let bounds = DockBounds {
            x: 800.0,
            y: 100.0,
            width: 390.0,
            height: 600.0,
        };
        assert!(bounds.validate(1280.0, 800.0).is_ok());
        assert!(DockBounds { x: -1.0, ..bounds }
            .validate(1280.0, 800.0)
            .is_err());
        assert!(DockBounds {
            width: f64::INFINITY,
            ..bounds
        }
        .validate(1280.0, 800.0)
        .is_err());
        assert!(DockBounds {
            width: 100000.0,
            ..bounds
        }
        .validate(1280.0, 800.0)
        .is_err());
        assert!(bounds.validate(1000.0, 800.0).is_err());
        assert!(bounds.validate(1280.0, 400.0).is_err());
    }
}
