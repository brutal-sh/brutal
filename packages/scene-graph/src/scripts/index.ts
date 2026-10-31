export {
  SCRIPT_INPUT_BINDING_PREFIX,
  scriptOfNode,
  withScript,
  SCRIPT_OVERRIDE_FIELDS,
  scriptChangedFields,
  withSyncedScript
} from './model'
export { scriptDefinitionSchema, type ScriptDefinition, type ScriptValue } from './schema'
export {
  hasCurrentScriptOutput,
  markScriptOutputCurrent,
  copyScriptOutputState,
  assertScriptOutputs
} from './output'

export { scriptInputVariable, resolveScriptInputVariables, scriptDefinitionChanges } from './inputs'
