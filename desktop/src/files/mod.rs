//! Documents on disk: `.fig` export and the recent files list.

pub mod fig;
#[cfg(target_os = "macos")]
pub mod pdf;
pub mod recent;
