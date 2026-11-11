import { isAbsolute } from 'pathe'
import * as v from 'valibot'

export const documentSourceIdentitySchema = v.object({
  handle: v.nullable(
    v.custom<FileSystemFileHandle>(
      (value) =>
        typeof FileSystemFileHandle !== 'undefined' && value instanceof FileSystemFileHandle
    )
  ),
  path: v.nullable(
    v.pipe(
      v.string(),
      v.check((path) => isAbsolute(path) && !path.includes('\0'))
    )
  )
})
