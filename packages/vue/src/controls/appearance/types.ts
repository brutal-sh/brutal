import type { MaybeRefOrGetter } from 'vue'

export type CornerRadiusKey =
  | 'topLeftRadius'
  | 'topRightRadius'
  | 'bottomRightRadius'
  | 'bottomLeftRadius'

export type CornerGeometryKey = CornerRadiusKey | 'cornerSmoothing'

export type CornerExpansion = 'selection' | 'manual'

export interface AppearanceOptions {
  cornerExpansion?: MaybeRefOrGetter<CornerExpansion>
}
