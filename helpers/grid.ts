import { Vector3 } from 'three'

// convert position to cell coordinates
export const positionToCell = (position: Vector3): [number, number] =>
    [Math.floor(position.x), Math.floor(position.z)]