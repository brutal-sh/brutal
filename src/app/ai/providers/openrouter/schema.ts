import * as v from 'valibot'

export const loopbackURLSchema = v.pipe(
  v.string(),
  v.url(),
  v.regex(/^http:\/\/localhost:[1-9]\d*\/auth\/callback$/)
)
