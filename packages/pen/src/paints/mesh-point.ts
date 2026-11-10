import type { MeshPoint } from '@open-pencil/scene-graph'

type MeshCoordinates<T> = { [Key in keyof MeshPoint]: T }

export function projectMeshPoint<T extends object, U extends object>(
  point: MeshCoordinates<T>,
  vector: (value: T) => U
): MeshCoordinates<U> {
  return {
    position: vector(point.position),
    ...(point.leftHandle && { leftHandle: vector(point.leftHandle) }),
    ...(point.rightHandle && { rightHandle: vector(point.rightHandle) }),
    ...(point.topHandle && { topHandle: vector(point.topHandle) }),
    ...(point.bottomHandle && { bottomHandle: vector(point.bottomHandle) })
  }
}
