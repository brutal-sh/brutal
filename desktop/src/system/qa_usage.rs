use std::time::Duration;

use reqwest::{redirect::Policy, Client, StatusCode, Url};
use security_framework::{
    item::{ItemClass, ItemSearchOptions},
    passwords::get_generic_password,
};
use serde::{Deserialize, Serialize};

const QA_USAGE_FLAG: &str = "--qa-usage-stats";
const QA_KEYCHAIN_SERVICE: &str = "brutal-signed-app-qa-usage";
const QA_KEYCHAIN_ACCOUNT: &str = "brutal";
const MAX_BATCH_BYTES: usize = 4096;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QaUsageStatus {
    requested_at_launch: bool,
    configured: bool,
}

#[derive(Deserialize)]
struct QaReceiver {
    endpoint: String,
    token: String,
}

fn receiver_from_keychain() -> Option<(Url, String)> {
    let secret = get_generic_password(QA_KEYCHAIN_SERVICE, QA_KEYCHAIN_ACCOUNT).ok()?;
    let receiver: QaReceiver = serde_json::from_slice(&secret).ok()?;
    let endpoint = Url::parse(&receiver.endpoint).ok()?;
    let host = endpoint.host_str()?;
    (endpoint.scheme() == "https"
        && host.starts_with("brutal-telemetry.")
        && host.ends_with(".workers.dev")
        && endpoint.port().is_none()
        && endpoint.username().is_empty()
        && endpoint.password().is_none()
        && endpoint.path() == "/ingest"
        && endpoint.query().is_none()
        && endpoint.fragment().is_none()
        && receiver.token.len() == 64
        && receiver.token.bytes().all(|byte| byte.is_ascii_hexdigit()))
    .then_some((endpoint, receiver.token))
}

async fn deliver(batch: serde_json::Value) -> Option<()> {
    let body = serde_json::to_vec(&batch).ok()?;
    if body.len() > MAX_BATCH_BYTES || super::env::sharing_disabled_by_env() {
        return None;
    }
    let (endpoint, token) = tauri::async_runtime::spawn_blocking(receiver_from_keychain)
        .await
        .ok()??;
    let client = Client::builder()
        .redirect(Policy::none())
        .timeout(Duration::from_secs(5))
        .build()
        .ok()?;
    let response = client
        .post(endpoint)
        .bearer_auth(token)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(body)
        .send()
        .await
        .ok()?;
    (response.status() == StatusCode::NO_CONTENT).then_some(())
}

#[tauri::command]
pub async fn qa_usage_status() -> QaUsageStatus {
    let configured = tauri::async_runtime::spawn_blocking(|| {
        ItemSearchOptions::new()
            .class(ItemClass::generic_password())
            .service(QA_KEYCHAIN_SERVICE)
            .account(QA_KEYCHAIN_ACCOUNT)
            .load_attributes(true)
            .load_data(false)
            .search()
            .is_ok_and(|items| !items.is_empty())
    })
    .await
    .unwrap_or(false);
    QaUsageStatus {
        requested_at_launch: std::env::args_os().any(|arg| arg == QA_USAGE_FLAG),
        configured,
    }
}

#[tauri::command]
pub async fn send_qa_usage(webview: tauri::Webview, batch: serde_json::Value) -> bool {
    webview.label() == "main" && deliver(batch).await.is_some()
}
