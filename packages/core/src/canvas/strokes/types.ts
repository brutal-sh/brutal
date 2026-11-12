import type { Path } from 'canvaskit-wasm'

import type { Stroke } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'

export interface StrokePaintInput {
  stroke: Stroke
  color: Color
}

export interface NodeStrokePaths {
  saved: Path[] | null
  vector: Path[] | null
  runs: Path[] | null
}
