import { count, params } from '@nanostores/i18n'

import { i18n } from '#vue/i18n/create'

export const filesMessageDefaults = {
  codeGuideTitle: 'Export Design to Code',
  codeGuideDescription:
    'Connect a coding agent to Open Pen’s local MCP server to turn your designs into code in your own project.',
  codeGuideServer: 'Local MCP server',
  codeGuideSteps: 'How to export your design to code',
  codeGuideLaunch: 'Open your design in Open Pen and keep the app running.',
  codeGuideConnect:
    'Open MCP settings to check the server and connect your coding client. Confirm that its MCP tools are available in the client before continuing.',
  codeGuideGenerate:
    'Select a frame, start your coding agent in the destination project, and ask it to build the selection with your preferred stack.',
  codeGuideExamples: 'Example prompts for your coding agent',
  codeGuidePagePrompt: 'Build the selected frame as a React page with Tailwind CSS.',
  codeGuideVariablesPrompt: 'Use the design variables to update the styles in this project.',
  codeGuideComponentPrompt: 'Turn the selected frame into a reusable component.',
  codeGuideSettings: 'Open MCP settings',
  figmaGuideTitle: 'How to import from Figma',
  figmaGuideClipboard: 'Copy a layer or frame in Figma, then paste it onto the Open Pen canvas.',
  figmaGuideFile:
    'For embedded images, save a local .fig copy from Figma, then open or drop it into Open Pen.',
  figmaGuideLimits:
    'Check advanced graphics after importing. Open preserves multiple pages; Import to canvas accepts a single-page file.',
  snapshotTitle: 'Export snapshot',
  snapshotDescription:
    'A snapshot bundles this design and its image, shader and script dependencies into a ZIP for another machine.',
  snapshotDependencies: 'Dependencies',
  snapshotImages: count({ one: '{count} image', many: '{count} images' }),
  snapshotShaders: count({ one: '{count} shader', many: '{count} shaders' }),
  snapshotScripts: count({ one: '{count} script', many: '{count} scripts' }),
  snapshotFailed: 'The snapshot could not be exported. Try again.',
  importLabel: 'Import',
  importHTMLCSS: 'Import HTML/CSS',
  importHTMLCSSDescription: 'Paste HTML plus optional CSS or compiled Tailwind CSS.',
  importFailed: 'Import failed. Check the HTML and CSS, then try again.',
  importReplacesDocument: 'Import replaces the current document.',
  importing: 'Importing…',
  importToCanvas: 'Import to canvas',
  newTab: 'New tab',
  home: 'Home',
  closeTab: params('Close {name}'),
  unsavedChanges: 'Unsaved changes',
  saveBeforeClosing: params('Save changes to “{name}”?'),
  saveBeforeClosingDescription: 'Your changes will be discarded if you close without saving.',
  discard: 'Don’t Save',
  clipboardImageUnavailableWeb:
    'Pasted design includes 1 image that cannot be loaded in the web app. Use the desktop app to include it.',
  clipboardImagesUnavailableWeb: params(
    'Pasted design includes {count} images that cannot be loaded in the web app. Use the desktop app to include them.'
  ),
  clipboardImageFetchFailed:
    'Failed to fetch 1 image from Figma. Check that the source file is accessible and try again.',
  clipboardImagesFetchFailed: params(
    'Failed to fetch {count} images from Figma. Check that the source file is accessible and try again.'
  ),
  mermaidPasteFailed: params('Could not read the Mermaid diagram. {error}'),
  recentFiles: 'Recent files',
  recentFilesDescription: 'Continue working on a design or start a new one.',
  noRecentFiles: 'No recent files yet',
  noRecentFilesDescription: 'Files you open in the desktop app will appear here.',
  searchFiles: 'Search files…',
  searchRecentAndStorageFiles: 'Search recent and storage files…',
  newDesign: 'New design',
  newDesignIn: params('New design in {place}'),
  noMatchingFiles: params('No files match “{query}”.'),
  saveAsPrompt: 'Save as:',
  browserFileAPINotSupported:
    "Your browser doesn't support the local file API. Files will be downloaded instead of saved in place."
} as const

export const filesMessages = i18n('files', filesMessageDefaults)
