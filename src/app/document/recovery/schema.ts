import { basename } from 'pathe'
import * as v from 'valibot'

import { WRITABLE_DOCUMENT_NAME } from '@/app/document/io/names'
import { documentSourceIdentitySchema } from '@/app/document/io/schema'

export const recoveryFileSourceSchema = v.pipe(
  v.object({
    fileName: v.pipe(v.string(), v.regex(WRITABLE_DOCUMENT_NAME)),
    identity: documentSourceIdentitySchema,
    nativeHash: v.optional(v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)))
  }),
  v.check((source) => source.identity.handle !== null || source.identity.path !== null),
  v.check(
    (source) => source.identity.handle === null || source.fileName === source.identity.handle.name
  ),
  v.check(
    (source) => source.identity.path === null || source.fileName === basename(source.identity.path)
  )
)
