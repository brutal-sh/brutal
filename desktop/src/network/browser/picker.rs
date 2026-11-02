use super::extract;

const SCRIPT: &str = include_str!("picker.js");

#[derive(Clone, Copy, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PickerAction {
    Start,
    Stop,
    Read,
    Select,
}

pub(super) async fn update(
    view: &tauri::Webview,
    request_id: &str,
    action: PickerAction,
    index: Option<usize>,
) -> Result<serde_json::Value, String> {
    if matches!(action, PickerAction::Select) && !index.is_some_and(|value| value < 64) {
        return Err("Choose an available element breadcrumb.".into());
    }
    let argument = serde_json::to_string(&serde_json::json!({
        "requestId": request_id, "action": action, "index": index
    }))
    .map_err(|e| e.to_string())?;
    extract::evaluate(view, format!("({SCRIPT})({argument})"), request_id).await
}

pub(super) async fn stage(
    view: &tauri::Webview,
    hidden: bool,
) -> Result<serde_json::Value, String> {
    const REQUEST_ID: &str = "00000000-0000-4000-8000-000000000000";
    let argument = serde_json::json!({
        "requestId": REQUEST_ID,
        "action": if hidden { "suspend" } else { "resume" }
    });
    extract::evaluate(view, format!("({SCRIPT})({argument})"), REQUEST_ID).await
}

pub(super) fn selection_rect(
    state: &serde_json::Value,
) -> Result<Option<super::capture::CaptureRect>, String> {
    match state.get("pick") {
        None | Some(serde_json::Value::Null) => Ok(None),
        Some(pick) => serde_json::from_value(
            pick.get("box")
                .ok_or("The selected element has no capture bounds.")?
                .clone(),
        )
        .map(Some)
        .map_err(|_| "The selected element has invalid capture bounds.".into()),
    }
}
