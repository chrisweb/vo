'use client'

import { useCallback, useEffect } from 'react'
import { Vector3 } from 'three'

interface UseKeyboardMovementProps {
    position: Vector3
    isMoving: boolean
    occupiedCells: Set<string>
    obstacles: {
        x: number
        z: number
    }[]
    gridWidth: number
    gridHeight: number
    updatePosition: (newPosition: Vector3, currentX: number, currentZ: number) => void
}

export const useKeyboardMovement = ({
    position,
    isMoving,
    occupiedCells,
    obstacles,
    gridWidth,
    gridHeight,
    updatePosition
}: UseKeyboardMovementProps) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Disable keyboard movement when automatic movement is active
        if (isMoving) return

        e.preventDefault()

        // Get current cell coordinates
        const currentX = Math.floor(position.x)
        const currentZ = Math.floor(position.z)

        // Calculate new cell based on direction
        let newX = currentX
        let newZ = currentZ

        switch (e.key) {
            case 'ArrowUp':
            case 'w':
                newZ = currentZ - 1
                break
            case 'ArrowDown':
            case 's':
                newZ = currentZ + 1
                break
            case 'ArrowLeft':
            case 'a':
                newX = currentX - 1
                break
            case 'ArrowRight':
            case 'd':
                newX = currentX + 1
                break
        }

        // Check if new cell is within grid bounds
        if (
            newX >= 0 && newX < gridWidth && newZ >= 0 &&
            newZ < gridHeight
        ) {
            // Check if the new cell is occupied by another user or obstacle
            const cellKey = `${newX.toString()},${newZ.toString()}`
            const isObstacle = obstacles.some(obs =>
                obs.x === newX && obs.z === newZ
            )

            if (
                (!occupiedCells.has(cellKey) ||
                    (newX === currentX && newZ === currentZ)) && !isObstacle
            ) {
                // Set new position to center of cell
                updatePosition(
                    new Vector3(newX + 0.5, 0.5, newZ + 0.5),
                    currentX,
                    currentZ
                )
            }
        }
    }, [position, occupiedCells, isMoving, obstacles, gridWidth, gridHeight, updatePosition])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [handleKeyDown])

    return null
}