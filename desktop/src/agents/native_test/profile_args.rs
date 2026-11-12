use std::ffi::OsString;
use std::path::PathBuf;

pub(crate) use crate::launch::args::NATIVE_PROFILE_FLAG as PROFILE_FLAG;

pub(crate) fn profile_argument(
    args: impl IntoIterator<Item = OsString>,
) -> Result<Option<PathBuf>, String> {
    let mut selected = None;
    for arg in args {
        if !arg.as_encoded_bytes().starts_with(PROFILE_FLAG.as_bytes()) {
            continue;
        }
        let value = arg
            .to_str()
            .and_then(|value| value.strip_prefix(PROFILE_FLAG))
            .and_then(|value| value.strip_prefix('='))
            .filter(|value| !value.is_empty())
            .ok_or("Native recovery persistence requires one absolute profile marker argument.")?;
        if selected.is_some() || !PathBuf::from(value).is_absolute() {
            return Err(
                "Native recovery persistence requires one absolute profile marker argument.".into(),
            );
        }
        selected = Some(PathBuf::from(value));
    }
    Ok(selected)
}

#[cfg(test)]
#[path = "profile_args_tests.rs"]
mod tests;
