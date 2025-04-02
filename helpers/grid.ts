export interface GridCell {
    // Integer from 0 to gridWidth-1
    x: number
    // Integer from 0 to gridHeight-1
    z: number
}

export type GridPath = GridCell[]

export const cellToString = (cell: GridCell): string => `${cell.x.toString()},${cell.z.toString()}`

export const stringToCell = (cellStr: string): GridCell => {
    const [x, z] = cellStr.split(',').map(Number)
    return { x, z }
}

// convert a Three.js Vector3 position to a grid cell
export const positionToGridCell = (position: { x: number, z: number }): GridCell => ({
    x: Math.floor(position.x),
    z: Math.floor(position.z)
})

// convert a grid cell to world position (center of cell)
export const gridCellToPosition = (cell: GridCell): { x: number, y: number, z: number } => ({
    x: cell.x + 0.5,
    y: 0.5,
    z: cell.z + 0.5
})