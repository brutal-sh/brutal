fn main() {
    // SF Symbols are drawn by SwiftUI, through a Swift library linked into the macOS app.
    #[cfg(target_os = "macos")]
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        swift_rs::SwiftLinker::new("13.0")
            .with_package("SFSymbols", "swift/sf-symbols")
            .link();
        // Command Line Tools can use Swift Build without an Xcode version for swift-rs to detect.
        let configuration = if std::env::var("DEBUG").as_deref() == Ok("true") {
            "Debug"
        } else {
            "Release"
        };
        let products = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap())
            .join("swift-rs/SFSymbols/out/Products")
            .join(configuration);
        if products.join("libSFSymbols.a").is_file() {
            println!("cargo:rustc-link-search=native={}", products.display());
        }
        // The Swift runtime the library uses ships with macOS.
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
    }
    tauri_build::build()
}
