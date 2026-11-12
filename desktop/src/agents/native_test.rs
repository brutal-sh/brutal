//! Only compiled into the test executable. Routing must be explicitly test-owned, never default.
use std::path::PathBuf;

pub(crate) mod profile;
pub(crate) mod profile_args;
pub(crate) mod profile_context;
#[cfg(test)]
pub(crate) mod profile_fixtures;
pub(crate) mod profile_identity;
pub(crate) mod profile_startup;
mod profile_store;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeTestMCPConfiguration {
    discovery_path: String,
    socket_path: String,
    root: String,
    port: u16,
}

#[tauri::command]
pub fn native_test_mcp_configuration(
    webview: tauri::Webview,
) -> Result<NativeTestMCPConfiguration, String> {
    if webview.label() != "main" {
        return Err("Test routing is editor-only.".into());
    }
    let directory = std::env::var("OPENPENCIL_NATIVE_TEST_DIRECTORY")
        .map(PathBuf::from)
        .map_err(|_| "Native tests require an isolated MCP directory.")?;
    let temp = std::env::temp_dir()
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let checked = directory.canonicalize().map_err(|e| e.to_string())?;
    if checked.parent() != Some(temp.as_path())
        || !checked
            .file_name()
            .is_some_and(|name| name.to_string_lossy().starts_with("openpen-native-test-"))
    {
        return Err("Native MCP test directory must be created by the test runner.".into());
    }
    let port = std::env::var("OPENPENCIL_NATIVE_TEST_MCP_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .filter(|port| *port >= 1024 && *port != 7600 && *port != 7610)
        .ok_or("Native tests require an isolated MCP port.")?;
    Ok(NativeTestMCPConfiguration {
        discovery_path: directory.join("mcp.json").display().to_string(),
        socket_path: directory.join("mcp.sock").display().to_string(),
        root: directory.display().to_string(),
        port,
    })
}
