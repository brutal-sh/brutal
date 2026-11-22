/** The app's release version; tests and tools that run app code without the Vite define get a placeholder. */
export const APP_VERSION =
  typeof __OPENPENCIL_APP_VERSION__ === 'string' ? __OPENPENCIL_APP_VERSION__ : '0.0.0-test'

export const APP_RELEASE_VERSION =
  typeof __BRUTAL_MACOS_BETA_VERSION__ === 'string' ? __BRUTAL_MACOS_BETA_VERSION__ : APP_VERSION
