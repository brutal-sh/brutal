import * as v from 'valibot'

const scriptValueSchema = v.union([v.string(), v.pipe(v.number(), v.finite()), v.boolean()])

/** Authored state only; generated layers and execution diagnostics are derived. */
export const scriptDefinitionSchema = v.object({
  uri: v.string(),
  inputs: v.record(v.string(), scriptValueSchema)
})

export type ScriptDefinition = v.InferOutput<typeof scriptDefinitionSchema>
export type ScriptValue = v.InferOutput<typeof scriptValueSchema>
