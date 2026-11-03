use std::sync::Mutex;
use tauri::{Emitter, Manager, Webview};

use super::{exports, policy::require_editor};

#[derive(Clone, serde::Serialize)]
pub struct CompletedVisit {
    url: String,
    generation: u64,
}

struct PendingHistory {
    generation: u64,
    visits: Vec<CompletedVisit>,
}

static HISTORY: Mutex<PendingHistory> = Mutex::new(PendingHistory {
    generation: 0,
    visits: Vec::new(),
});
const MAX_PENDING_VISITS: usize = 50;

pub(super) fn completed(view: &Webview, url: &url::Url) {
    if exports::target(
        url.as_str(),
        view.app_handle().config().build.dev_url.as_ref(),
    )
    .is_err()
    {
        return;
    }
    if let Ok(mut history) = HISTORY.lock() {
        history.visits.retain(|visit| visit.url != url.as_str());
        let generation = history.generation;
        history.visits.push(CompletedVisit {
            url: url.to_string(),
            generation,
        });
        if history.visits.len() > MAX_PENDING_VISITS {
            history.visits.remove(0);
        }
    }
    // Only signal completion; URLs remain behind the editor-only queue command.
    let _ = view.app_handle().emit("browser-preview:page-loaded", ());
}

#[tauri::command]
pub fn take_browser_preview_visits(webview: Webview) -> Result<Vec<CompletedVisit>, String> {
    require_editor(webview.label())?;
    let mut history = HISTORY
        .lock()
        .map_err(|_| "Browser history is temporarily unavailable.")?;
    Ok(std::mem::take(&mut history.visits))
}

#[tauri::command]
pub fn clear_browser_preview_visits(webview: Webview, url: Option<String>) -> Result<u64, String> {
    require_editor(webview.label())?;
    let target = url
        .map(|url| {
            let parsed = url::Url::parse(&url).map_err(|_| "The history address is invalid.")?;
            if parsed.scheme() == "file" {
                Ok(parsed)
            } else {
                exports::target(&url, webview.app_handle().config().build.dev_url.as_ref())
            }
        })
        .transpose()?;
    let mut history = HISTORY
        .lock()
        .map_err(|_| "Browser history is temporarily unavailable.")?;
    history.generation = history
        .generation
        .checked_add(1)
        .ok_or("Restart the browser to clear its history.")?;
    if let Some(target) = target {
        history.visits.retain(|visit| visit.url != target.as_str());
    } else {
        history.visits.clear();
    }
    Ok(history.generation)
}
