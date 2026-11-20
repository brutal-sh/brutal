import { params } from '@nanostores/i18n'

export const aiFailureDefaults = {
  chatAuthenticationFailed: 'Your provider API key is invalid or expired. Replace it in Settings.',
  chatSignInExpired: 'Your sign-in has expired. Sign in again in Settings.',
  chatPlanForbidden: 'Your plan can’t use the selected model. Choose another model in Settings.',
  chatForbidden: 'This API key cannot use the selected model. Check its model access.',
  chatInsufficientCredit:
    'The provider account has insufficient credit or quota. Top it up and try again.',
  chatOutputLimit:
    'The model ran out of output tokens while reasoning. Raise Max output tokens or lower reasoning effort.',
  chatModelNotFound: 'The selected model is unavailable. Choose another model in Settings.',
  chatNetworkFailed: 'Brutal could not reach the provider. Check your connection and endpoint.',
  chatRateLimited: 'The provider rate limit was reached. Wait a moment and try again.',
  chatRequestFailed: 'The model request failed. Check the provider settings and try again.',
  openProviderSettingsAction: 'Open settings',
  cloudWorkspace: 'Workspace',
  cloudWorkspaceHint: 'The workspace whose plan pays for these requests.',
  cloudAIUnavailable: 'Sign in to a Cloud server that offers AI to use these models.',
  cloudAINoWorkspace: 'None of your workspaces on this server includes AI.',
  cloudAICatalogFailed: 'Cloud could not list its models. Check your connection and try again.',
  cloudAIWorkspacesFailed:
    'Cloud could not check which of your workspaces include AI. Check your connection and try again.',
  chatCloudCreditsExhausted:
    'This workspace has used this month’s AI credits. Manage its plan to add more.',
  chatCloudAllowanceUsed:
    'This workspace has used this month’s AI allowance. Ask your Cloud administrator to raise it.',
  chatCloudAllowanceUsedUntil: params(
    'This workspace has used this month’s AI allowance. It renews on {date}. Ask your Cloud administrator to raise it sooner.'
  ),
  connectionTestCloudCreditsExhausted: 'This workspace has no AI credits left this month.',
  cloudCreditsLeft: params('{credits} credits left'),
  cloudCreditsRenew: params('Renews {date}'),
  manageCloudPlanAction: 'Manage plan',
  chatCloudUnavailable:
    'Cloud AI is unavailable. Sign in to Cloud and choose a workspace in Settings.',
  visionModelUnavailable: 'Choose a Vision model in Settings before attaching images.',
  chatPiCompanionMissing: 'Pi needs the Harness companion. Run guided setup to install it.',
  chatPiCompanionOutdated:
    'The Harness companion doesn’t match this version of Brutal. Run guided setup to update it.',
  chatMCPOutdated:
    'Brutal’s MCP server doesn’t match this version of Brutal. Run guided setup to update it.',
  chatPiSignIn:
    'Pi isn’t signed in to a provider. Run pi in a terminal and type /login, or add an AI Gateway key.',
  chatPiModel:
    'Pi has no model to use. Run pi in a terminal and type /model, or choose one in Settings.'
} as const
