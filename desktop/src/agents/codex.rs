use serde_json::{Map, Value};

const INVALID_CONFIG: &str = "Codex's CODEX_CONFIG must contain a JSON object.";

fn chat_config(existing: Option<&str>) -> Result<String, String> {
    let mut config = match existing {
        Some(text) => serde_json::from_str::<Map<String, Value>>(text)
            .map_err(|_| INVALID_CONFIG.to_owned())?,
        None => Map::new(),
    };
    let skills = config
        .entry("skills")
        .or_insert_with(|| Value::Object(Map::new()))
        .as_object_mut()
        .ok_or_else(|| INVALID_CONFIG.to_owned())?;
    // Open Pen passes explicitly invoked skills in the prompt; the global catalog can overflow.
    skills.insert("include_instructions".to_owned(), Value::Bool(false));
    serde_json::to_string(&config).map_err(|_| INVALID_CONFIG.to_owned())
}

/// Scope automatic skill-catalog injection to this app's child, retaining the user's settings.
#[tauri::command]
pub fn codex_acp_config(webview: tauri::Webview) -> Result<String, String> {
    if webview.label() != "main" {
        return Err("Codex configuration is editor-only.".to_owned());
    }
    let existing = match std::env::var("CODEX_CONFIG") {
        Ok(text) => Some(text),
        Err(std::env::VarError::NotPresent) => None,
        Err(_) => return Err(INVALID_CONFIG.to_owned()),
    };
    chat_config(existing.as_deref())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn scopes_only_automatic_skill_instructions() {
        let config = chat_config(None).unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&config).unwrap(),
            json!({ "skills": { "include_instructions": false } })
        );
    }

    #[test]
    fn retains_other_settings_and_skill_overrides() {
        let original = json!({ "model": "custom", "skills": {
            "include_instructions": true,
            "max_context_tokens": 5000,
            "config": [{ "name": "example", "enabled": true }]
        }, "unknown": { "preserve": [1, 2] } });
        let config = chat_config(Some(&original.to_string())).unwrap();
        let mut expected = original;
        expected["skills"]["include_instructions"] = Value::Bool(false);
        assert_eq!(serde_json::from_str::<Value>(&config).unwrap(), expected);
    }

    #[test]
    fn rejects_invalid_settings_without_echoing_them() {
        for input in ["invalid-private-value", "null", "[]", r#"{"skills":false}"#] {
            assert_eq!(chat_config(Some(input)), Err(INVALID_CONFIG.to_owned()));
        }
    }
}
