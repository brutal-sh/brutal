//! Coding agents, their companions, and the MCP server they reach OpenPencil through.

pub mod codex;
pub mod lookup;
pub mod mcp;
pub mod path;
pub mod skills;

#[cfg(feature = "native-test")]
pub mod native_test;
