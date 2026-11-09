import * as v from 'valibot'

const dimensionSchema = v.union([v.pipe(v.number(), v.finite()), v.string()])

/** Authored dimensions stay separate from the Note's measured, clamped geometry. */
export const noteDefinitionSchema = v.strictObject({
  width: v.optional(dimensionSchema),
  height: v.optional(dimensionSchema)
})

export type NoteDefinition = v.InferOutput<typeof noteDefinitionSchema>
