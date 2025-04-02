'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { Vector3 } from 'three'
import PF from 'pathfinding'
import { GridCell, GridPath, positionToGridCell, stringToCell } from '@/helpers/grid'

interface PathfindingHelperProps {
    // cells in the x direction (0 to gridWidth-1)
    gridWidth: number
    // cells in the z direction (0 to gridHeight-1)
    gridHeight: number
    obstacles: GridCell[]
    occupiedCells: Set<string>
    userPosition: {
        x: number
        z: number
    }
}

export const usePathfinding = ({
    gridWidth,
    gridHeight,
    obstacles,
    occupiedCells,
    userPosition,
}: PathfindingHelperProps) => {

    const [gridState, setGridState] = useState<PF.Grid | null>(null)
    const [finderState, setFinderState] = useState<PF.AStarFinder | null>(null)
    const [targetCell, setTargetCell] = useState<GridCell | null>(null)
    const [path, setPath] = useState<GridPath>([])
    const [isMoving, setIsMoving] = useState(false)
    const position = useMemo(() => new Vector3(userPosition.x, 0, userPosition.z), [userPosition.x, userPosition.z])
    const userGridCell = useMemo(() => positionToGridCell(position), [position])

    useEffect(() => {
        // grid dimensions (0 to width-1, 0 to height-1)
        const grid = new PF.Grid(gridWidth, gridHeight)

        // mark obstacles as unwalkable
        obstacles.forEach((obstacle) => {
            // prevent accessing out-of-bounds cells
            if (obstacle.x >= 0 && obstacle.x < gridWidth &&
                obstacle.z >= 0 && obstacle.z < gridHeight) {
                grid.setWalkableAt(obstacle.x, obstacle.z, false)
            } else {
                console.warn(`Obstacle out of bounds: (${obstacle.x.toString()}, ${obstacle.z.toString()})`)
            }
        })

        // mark cells occupied by other users as unwalkable
        occupiedCells.forEach((occupiedCell) => {
            const cell = stringToCell(occupiedCell)
            if (cell.x >= 0 && cell.x < grid.width &&
                cell.z >= 0 && cell.z < grid.height) {
                grid.setWalkableAt(cell.x, cell.z, false)
            }
        })

        setGridState(grid)

        // new pathfinder with diagonal movement disabled
        const newFinder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.Never,
        })

        setFinderState(newFinder)
    }, [gridWidth, gridHeight, obstacles, occupiedCells])

    const findPath = useCallback((
        startCell: GridCell,
        targetCell: GridCell,
    ): GridPath => {
        if (!gridState || !finderState) return []

        // if cells are the same, return empty path
        if (startCell.x === targetCell.x && startCell.z === targetCell.z) return []

        // path using the pathfinding library
        const path = finderState.findPath(
            startCell.x,
            startCell.z,
            targetCell.x,
            targetCell.z,
            gridState,
        )

        // convert to GridCell format and remove the starting position
        return path.slice(1).map(point => ({ x: point[0], z: point[1] }))
    }, [gridState, finderState])

    const handleGridClick = useCallback(
        (x: number, z: number) => {

            if (!gridState) return

            // object for the clicked position
            const clickedCell: GridCell = { x, z }

            // make sure the target cell is walkable
            if (!gridState.isWalkableAt(x, z)) return

            // check if target cell is user's current position
            if (x === userGridCell.x && z === userGridCell.z) return

            const path = findPath(userGridCell, clickedCell)

            if (path.length > 0) {
                setTargetCell(clickedCell)
                setPath(path)
                setIsMoving(true)
            }
        },
        [userGridCell, gridState, findPath]
    )

    return {
        targetCell,
        path,
        isMoving,
        setPath,
        setIsMoving,
        setTargetCell,
        handleGridClick
    }
}