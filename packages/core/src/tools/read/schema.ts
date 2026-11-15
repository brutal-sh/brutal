import * as v from 'valibot'

const stateIdentitySchema = v.strictObject({ id: v.string(), name: v.string() })

/** Independent graph metadata; rootId is not an app tab or automation target ID. */
export const appStateSchema = v.strictObject({
  graph: v.strictObject({ rootId: v.string(), name: v.string() }),
  page: stateIdentitySchema,
  selection: v.array(v.strictObject({ id: v.string(), name: v.string(), type: v.string() }))
})

export type AppState = v.InferOutput<typeof appStateSchema>
