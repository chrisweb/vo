'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { Vector3 } from 'three'
import PF from 'pathfinding'

interface PathfindingHelperProps {
    gridWidth: number
    gridHeight: number
    obstacles: {
        x: number
        z: number
    }[]
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
    const [targetCell, setTargetCell] = useState<[number, number] | null>(null)
    const [path, setPath] = useState<number[][]>([])
    const [isMoving, setIsMoving] = useState(false)
    const position = useMemo(() => new Vector3(userPosition.x, 0, userPosition.z), [userPosition.x, userPosition.z])

    // pathfinding grid and finder
    useEffect(() => {

        const grid = new PF.Grid(gridWidth, gridHeight)

        // mark obstacles as unwalkable
        obstacles.forEach((obstacle) => {
            // boundary check to prevent accessing out-of-bounds cells
            if (obstacle.x >= 0 && obstacle.x < gridWidth &&
                obstacle.z >= 0 && obstacle.z < gridHeight) {
                grid.setWalkableAt(obstacle.x, obstacle.z, false)
            } else {
                console.warn(`Obstacle out of bounds: (${obstacle.x.toString()}, ${obstacle.z.toString()})`)
            }
        })

        setGridState(grid)

        // create a new pathfinder with compatible options
        const newFinder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.Never,
        })

        setFinderState(newFinder)

    }, [gridWidth, gridHeight, obstacles])

    const findPath = useCallback((
        startX: number,
        startZ: number,
        targetX: number,
        targetZ: number,
    ) => {
        if (!gridState || !finderState) return []

        // if cells are the same, return empty path
        if (startX === targetX && startZ === targetZ) return []

        // if target cell has an obstacle, return empty path
        const isTargetObstacle = obstacles.some(obs =>
            obs.x === targetX && obs.z === targetZ
        )
        if (isTargetObstacle) return []

        // if target cell is occupied by another user, return empty path
        const targetCellKey = `${targetX.toString()},${targetZ.toString()}`
        const isOccupiedByUser = occupiedCells.has(targetCellKey) &&
            !(targetX === Math.floor(position.x) &&
                targetZ === Math.floor(position.z))

        if (isOccupiedByUser) return []

        // clone the grid to avoid modifying the original
        const gridClone = gridState.clone()

        // mark cells occupied by other users as unwalkable
        occupiedCells.forEach((cell) => {
            const [x, z] = cell.split(',').map(Number)
            // skip current user position
            const isCurrentUserPos = x === Math.floor(position.x) &&
                z === Math.floor(position.z)

            if (!isCurrentUserPos && x >= 0 && x < gridClone.width && z >= 0 && z < gridClone.height) {
                gridClone.setWalkableAt(x, z, false)
            }
        })

        // check if target is walkable
        if (targetX >= 0 && targetX < gridClone.width && targetZ >= 0 && targetZ < gridClone.height) {
            gridClone.setWalkableAt(targetX, targetZ, true)
        }

        // Find path
        const pfPath = finderState.findPath(
            startX,
            startZ,
            targetX,
            targetZ,
            gridClone,
        )

        // convert path format and remove the starting position
        return pfPath.slice(1).map(point => [point[0], point[1]])

    }, [gridState, finderState, obstacles, occupiedCells, position])

    const handleGridClick = useCallback(
        (x: number, z: number) => {

            // check if target cell has an obstacle
            if (!gridState?.isWalkableAt(x, z)) return

            // check if target cell is user's current position
            const userX = Math.floor(userPosition.x)
            const userZ = Math.floor(userPosition.z)
            if (x === userX && z === userZ) return

            const startX = Math.floor(userPosition.x)
            const startZ = Math.floor(userPosition.z)

            // find path to target using pathfinding.js
            const newPath = findPath(startX, startZ, x, z)

            if (newPath.length > 0) {
                setTargetCell([x, z])
                setPath(newPath)
                setIsMoving(true)
            }
        },
        [userPosition, isMoving, findPath, obstacles]
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