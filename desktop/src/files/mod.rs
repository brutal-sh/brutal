//! Documents on disk: `.fig` export and the recent files list.

#[cfg(target_os = "macos")]
mod artwork;
pub mod fig;
#[cfg(target_os = "macos")]
pub mod pdf;
#[cfg(target_os = "macos")]
pub mod photoshop;
pub mod recent;
