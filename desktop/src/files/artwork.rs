//! Binary canvas artwork shared by the native page and image readers.
pub(super) const MAX_ARTWORK_SIDE: i32 = 2048;
pub(super) const MAX_ARTWORK_OUTPUT_BYTES: usize = 48 * 1024 * 1024;

// Page count is written by the caller. Each page has two little-endian doubles,
// a little-endian PNG length and the PNG bytes, as read by Core raster import.
pub(super) fn append_artwork_page(output: &mut Vec<u8>, width: f64, height: f64, png: &[u8]) {
    output.extend_from_slice(&width.to_le_bytes());
    output.extend_from_slice(&height.to_le_bytes());
    output.extend_from_slice(&(png.len() as u32).to_le_bytes());
    output.extend_from_slice(png);
}
