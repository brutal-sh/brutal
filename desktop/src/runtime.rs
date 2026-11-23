use crate::launch::{self, args};
use crate::menu::{install_app_menu, NativeMenuInputs};
#[cfg(feature = "native-test")]
use crate::system;
#[cfg(target_os = "macos")]
use crate::system::window::show_main_window;
use tauri::{Emitter, Manager};

pub(crate) fn builder() -> tauri::Builder<tauri::Wry> {
    let mut builder = tauri::Builder::default();

    #[cfg(feature = "native-test")]
    {
        builder = builder
            .manage(system::opener::OpenedExternalUrls::default())
            .plugin(tauri_plugin_wdio::init())
            .plugin(tauri_plugin_wdio_webdriver::init());
    }

    #[cfg(all(
        any(target_os = "macos", windows, target_os = "linux"),
        not(feature = "native-test")
    ))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            launch::queue_deep_links(app, args::deep_links_from_args(&args));
            launch::queue_open_paths(
                app,
                args::open_paths_from_args(args, std::path::Path::new(&cwd)),
            );
        }));
    }

    builder.plugin(tauri_plugin_deep_link::init())
}

pub(crate) fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    launch::queue_open_paths(app.handle(), args::startup_open_paths());

    use tauri_plugin_deep_link::DeepLinkExt;
    // On macOS the plugin turns `RunEvent::Opened` into this callback, so every
    // link that arrives while the app runs is handled here; the cold-start link
    // arrives before this closure and is drained from `current` below. The
    // `Opened` arm further down keeps handling file URLs.
    let handle = app.handle().clone();
    app.deep_link().on_open_url(move |event| {
        launch::queue_deep_links(&handle, event.urls());
    });
    #[cfg(any(windows, target_os = "linux"))]
    {
        if let Err(error) = app.deep_link().register_all() {
            eprintln!("[deep-link] register_all failed: {error}");
        }
    }
    // Every desktop platform can deliver the launch link before this closure
    // runs, which means before the listener above exists, and the plugin's
    // `deep-link://new-url` emit then reaches nobody:
    //
    // - Windows / Linux: the link is argv, and the plugin parses it in its own
    //   setup (`handle_cli_arguments`).
    // - macOS: AppKit delivers the GetURL event *before* the app's setup. Traced
    //   on a cold `open openpen://…`: `RunEvent::Opened` at T+0.085 s, this
    //   closure at T+0.342 s, and `on_open_url` never fired.
    //
    // In all three cases the URL survives only in the plugin's `current`, so it
    // is read here. No link can be queued twice: `RunEvent::Opened` is dispatched
    // on the main thread, the same thread this closure runs on, so a link cannot
    // arrive between the registration above and this read — anything later goes
    // to `on_open_url` and is no longer in `current` by the time it is read.
    if let Ok(Some(urls)) = app.deep_link().get_current() {
        launch::queue_deep_links(app.handle(), urls);
    }

    Ok(install_app_menu(
        app.handle(),
        &NativeMenuInputs::default(),
    )?)
}

pub(crate) fn on_event(_app: &tauri::AppHandle, event: tauri::RunEvent) {
    match event {
        #[cfg(all(target_os = "macos", not(feature = "native-test")))]
        tauri::RunEvent::Ready => {
            // The updater starts the new binary directly, without a Finder reopen event.
            // Bring its editor forward once AppKit and the main window are ready.
            show_main_window(_app);
        }
        tauri::RunEvent::ExitRequested {
            api, code: None, ..
        } if !_app.windows().is_empty() => {
            api.prevent_exit();
            // The frontend asks about unsaved documents and exits when they agree.
            let _ = _app.emit("menu-event", "quit");
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Opened { urls } => {
            let paths = urls
                .into_iter()
                .filter_map(|url| url.to_file_path().ok())
                .filter_map(args::file_association_path)
                .collect();
            launch::queue_open_paths(_app, paths);
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } => show_main_window(_app),
        _ => {}
    }
}
