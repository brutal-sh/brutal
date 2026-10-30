use std::sync::{Arc, Mutex};
use std::time::Duration;

const SCRIPT: &str = include_str!("extract.js");
const MAX_PAYLOAD_BYTES: usize = 16 * 1024 * 1024;

fn validate_result(input: &str, request_id: &str) -> Result<serde_json::Value, String> {
    if input.len() > MAX_PAYLOAD_BYTES {
        return Err("The page exceeds the editable import payload limit.".into());
    }
    let value: serde_json::Value = serde_json::from_str(input)
        .map_err(|_| "The browser returned an invalid page description.")?;
    if value.get("requestId").and_then(|id| id.as_str()) != Some(request_id) {
        return Err("The browser returned an expired import response. Try again.".into());
    }
    if let Some(error) = value.get("error").and_then(|error| error.as_str()) {
        return Err(error.chars().take(500).collect());
    }
    Ok(value)
}

pub async fn page(view: &tauri::Webview, request_id: &str) -> Result<serde_json::Value, String> {
    if request_id.len() != 36
        || !request_id
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() || byte == b'-')
    {
        return Err("Invalid browser import request identifier.".into());
    }
    let argument = serde_json::to_string(request_id).map_err(|e| e.to_string())?;
    let (sender, receiver) = tokio::sync::oneshot::channel();
    let sender = Arc::new(Mutex::new(Some(sender)));
    view.eval_with_callback(format!("({SCRIPT})({argument})"), move |result| {
        if let Ok(mut pending) = sender.lock() {
            if let Some(sender) = pending.take() {
                let _ = sender.send(result);
            }
        }
    })
    .map_err(|e| e.to_string())?;
    let result = tokio::time::timeout(Duration::from_secs(15), receiver)
        .await
        .map_err(|_| "Page extraction timed out. The design was not changed.")?
        .map_err(|_| "The browser closed before extraction finished.")?;
    validate_result(&result, request_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_expired_malformed_and_oversized_payloads() {
        assert!(validate_result("not json", "request").is_err());
        assert!(validate_result(r#"{"requestId":"old"}"#, "request").is_err());
        assert!(validate_result(&" ".repeat(MAX_PAYLOAD_BYTES + 1), "request").is_err());
        assert!(validate_result(r#"{"requestId":"request","nodes":[]}"#, "request").is_ok());
    }
}
