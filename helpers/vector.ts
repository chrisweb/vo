import { Vector3 } from 'three'

export const serializeVector3 = (vec: Vector3) => {
    return { x: vec.x, y: vec.y, z: vec.z }
}

export const deserializeVector3 = (vec: { x: number, y: number, z: number }) => {
    return new Vector3(vec.x, vec.y, vec.z)
}
