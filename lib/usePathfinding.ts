'use client'

import { useCallback, useEffect, useState } from 'react'
import { Vector3 } from 'three'
import PF from 'pathfinding'

interface UsePathfindingProps {
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
}: UsePathfindingProps) => {
    const [grid, setGrid] = useState<PF.Grid | null>(null)
    const [finder, setFinder] = useState<PF.AStarFinder | null>(null)
    const [targetCell, setTargetCell] = useState<[number, number] | null>(null)
    const [path, setPath] = useState<number[][]>([])
    const [isMoving, setIsMoving] = useState(false)
    const position = new Vector3(userPosition.x, 0, userPosition.z)

    // pathfinding grid and finder
    useEffect(() => {

        const newGrid = new PF.Grid(gridWidth, gridHeight)

        // mark obstacles as unwalkable
        obstacles.forEach((obstacle) => {
            newGrid.setWalkableAt(obstacle.x, obstacle.z, false)
        })

        setGrid(newGrid)

        // create a new pathfinder with compatible options
        const newFinder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.Never,
        })

        setFinder(newFinder)
    }, [gridWidth, gridHeight, obstacles])

    const findPath = useCallback((
        startX: number,
        startZ: number,
        targetX: number,
        targetZ: number,
    ) => {
        if (!grid || !finder) return []

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
        const gridClone = grid.clone()

        // mark cells occupied by other users as unwalkable
        occupiedCells.forEach((cell) => {
            const [x, z] = cell.split(',').map(Number)
            // skip current user position
            const isCurrentUserPos = x === Math.floor(position.x) &&
                z === Math.floor(position.z)

            if (!isCurrentUserPos) {
                gridClone.setWalkableAt(x, z, false)
            }
        })

        // check if target is walkable
        gridClone.setWalkableAt(targetX, targetZ, true)

        // Find path
        const pfPath = finder.findPath(
            startX,
            startZ,
            targetX,
            targetZ,
            gridClone,
        )

        // convert path format and remove the starting position
        return pfPath.slice(1).map(point => [point[0], point[1]])

    }, [grid, finder, obstacles, occupiedCells, position])

    const handleGridClick = useCallback(
        (x: number, z: number) => {
            if (isMoving) return

            // check if target cell has an obstacle
            const isObstacle = obstacles.some(obs =>
                obs.x === x && obs.z === z
            )
            if (isObstacle) return

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