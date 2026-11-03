use super::policy::DockBounds;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

impl Size {
    pub fn validate(self) -> Result<Self, String> {
        if [self.width, self.height]
            .iter()
            .all(|value| value.is_finite() && (1.0..=8192.0).contains(value))
        {
            Ok(self)
        } else {
            Err("The browser viewport dimensions are invalid.".into())
        }
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use super::*;
    use objc2::{rc::Retained, MainThreadMarker};
    use objc2_app_kit::{NSUserInterfaceItemIdentification, NSView};
    use objc2_foundation::{NSPoint, NSRect, NSSize, NSString};
    use objc2_web_kit::WKWebView;

    const HOST: &str = "open-pen-browser-viewport";

    async fn with_view<T: Send + 'static>(
        view: &tauri::Webview,
        operation: impl FnOnce(&WKWebView, MainThreadMarker) -> Result<T, String> + Send + 'static,
    ) -> Result<T, String> {
        let (sender, receiver) = tokio::sync::oneshot::channel();
        view.with_webview(move |native| {
            let result = MainThreadMarker::new()
                .ok_or("Browser layout needs the main thread.".into())
                .and_then(|mtm| {
                    // The platform closure owns access to the live WKWebView on its main thread.
                    operation(unsafe { &*native.inner().cast::<WKWebView>() }, mtm)
                });
            let _ = sender.send(result);
        })
        .map_err(|e| e.to_string())?;
        tokio::time::timeout(std::time::Duration::from_secs(1), receiver)
            .await
            .map_err(|_| "The browser layout was not ready.")?
            .map_err(|_| "The browser closed before its layout was ready.".to_owned())?
    }

    fn host(view: &WKWebView) -> Result<Retained<NSView>, String> {
        // The retained parent stays alive throughout this main-thread operation.
        let parent = unsafe { view.superview() }.ok_or("The browser dock closed.")?;
        if parent.identifier().is_some_and(|id| id.to_string() == HOST) {
            Ok(parent)
        } else {
            Err("The browser viewport is not attached.".into())
        }
    }

    pub(crate) async fn set_bounds(
        view: &tauri::Webview,
        bounds: DockBounds,
        size: Size,
    ) -> Result<(), String> {
        with_view(view, move |view, mtm| {
            let wrapper = match host(view) {
                Ok(wrapper) => wrapper,
                Err(_) => {
                    let parent = unsafe { view.superview() }.ok_or("The browser dock closed.")?;
                    let wrapper = NSView::new(mtm);
                    wrapper.setIdentifier(Some(&NSString::from_str(HOST)));
                    parent.addSubview(&wrapper);
                    view.removeFromSuperview();
                    wrapper.addSubview(view);
                    wrapper
                }
            };
            let parent = unsafe { wrapper.superview() }.ok_or("The browser host closed.")?;
            let y = if parent.isFlipped() {
                bounds.y
            } else {
                parent.frame().size.height - bounds.y - bounds.height
            };
            wrapper.setFrame(NSRect::new(
                NSPoint::new(bounds.x, y),
                NSSize::new(bounds.width, bounds.height),
            ));
            let content = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(size.width, size.height));
            // Scale the host, keeping WebKit's own layout at its exact CSS viewport size.
            wrapper.setBounds(content);
            view.setFrame(content);
            view.setBounds(content);
            view.setNeedsDisplay(true);
            unsafe { view.setPageZoom(1.0) };
            Ok(())
        })
        .await
    }

    pub(crate) async fn bounds(view: &tauri::Webview) -> Result<Option<DockBounds>, String> {
        with_view(view, |view, _| {
            let Ok(wrapper) = host(view) else {
                return Ok(None);
            };
            let Some(parent) = (unsafe { wrapper.superview() }) else {
                return Ok(None);
            };
            let frame = wrapper.frame();
            Ok(Some(DockBounds {
                x: frame.origin.x,
                y: if parent.isFlipped() {
                    frame.origin.y
                } else {
                    parent.frame().size.height - frame.origin.y - frame.size.height
                },
                width: frame.size.width,
                height: frame.size.height,
            }))
        })
        .await
    }

    pub(crate) async fn visible(view: &tauri::Webview, visible: bool) -> Result<(), String> {
        with_view(view, move |view, _| {
            host(view)?.setHidden(!visible);
            view.setHidden(!visible);
            Ok(())
        })
        .await
    }

    pub(crate) async fn detach(view: &tauri::Webview) -> Result<(), String> {
        with_view(view, |view, _| {
            let Ok(wrapper) = host(view) else {
                return Ok(());
            };
            if let Some(parent) = unsafe { wrapper.superview() } {
                // Keep Wry's child attached to the window until its queued close is processed.
                let frame = wrapper.frame();
                view.removeFromSuperview();
                parent.addSubview(view);
                view.setFrame(frame);
                view.setBounds(NSRect::new(NSPoint::new(0.0, 0.0), frame.size));
            }
            wrapper.removeFromSuperview();
            Ok(())
        })
        .await
    }
}

#[cfg(target_os = "macos")]
pub(super) use platform::{bounds, detach, set_bounds, visible};

#[cfg(not(target_os = "macos"))]
pub(super) async fn set_bounds(
    view: &tauri::Webview,
    bounds: DockBounds,
    size: Size,
) -> Result<(), String> {
    view.set_bounds(tauri::Rect {
        position: tauri::LogicalPosition::new(bounds.x, bounds.y).into(),
        size: tauri::LogicalSize::new(bounds.width, bounds.height).into(),
    })
    .map_err(|e| e.to_string())?;
    view.set_zoom(bounds.width / size.width)
        .map_err(|e| e.to_string())
}

#[cfg(not(target_os = "macos"))]
pub(super) async fn bounds(view: &tauri::Webview) -> Result<Option<DockBounds>, String> {
    let scale = view.window().scale_factor().map_err(|e| e.to_string())?;
    let size = view
        .size()
        .map_err(|e| e.to_string())?
        .to_logical::<f64>(scale);
    let position = view
        .position()
        .map_err(|e| e.to_string())?
        .to_logical::<f64>(scale);
    Ok(Some(DockBounds {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    }))
}

#[cfg(not(target_os = "macos"))]
pub(super) async fn visible(view: &tauri::Webview, visible: bool) -> Result<(), String> {
    (if visible { view.show() } else { view.hide() }).map_err(|e| e.to_string())
}

#[cfg(not(target_os = "macos"))]
pub(super) async fn detach(_view: &tauri::Webview) -> Result<(), String> {
    Ok(())
}
