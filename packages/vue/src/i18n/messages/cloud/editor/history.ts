import { params } from '@nanostores/i18n'

export const cloudHistoryDefaults = {
  // Version history
  versionHistory: 'Version history',
  closeVersionHistory: 'Close version history',
  currentVersion: 'Current version',
  addToVersionHistory: 'Add to version history',
  editVersionInfo: 'Edit version info',
  versionTitle: 'Title',
  versionDescription: 'Describe what changed',
  restoreVersion: 'Restore this version',
  duplicateVersion: 'Duplicate',
  deleteVersionInfo: 'Delete version info',
  versionOptions: 'More options for version',
  versionFilter: 'Filter versions',
  versionsAll: 'All',
  versionsOnlyYours: 'Only yours',
  showAutosaveVersions: 'Show autosave versions',
  restoredVersion: params('Restored version: {name}'),
  restoredVersionUnnamed: 'Restored version',
  viewingVersion: params('Viewing {name}'),
  olderVersions: 'Show older versions',
  noVersions: 'No versions to show',
  versionsFailed: 'Couldn’t load the version history.',
  versionFailed: 'Couldn’t open this version.',
  versionChangeFailed: 'Couldn’t change the version history.',
  versionCopyName: params('{name} (copy)')
} as const
