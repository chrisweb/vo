'use client'

import { useEffect, useRef } from 'react'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Vector3 } from 'three'
import * as THREE from 'three'
import { Grid } from './Grid'
import { Obstacles, type Obstacle } from './Obstacles'
import { UserAvatar } from './UserAvatar'
import { useUser } from '@/hooks/useUser'
import { usePathfinding } from '@/hooks/usePathfinding'
import { positionToGridCell, gridCellToPosition } from '@/helpers/grid'

interface WorldProps {
    username: string
}

// grid dimensions: 20x20 = 400 cells
const GRID_WIDTH = 20
const GRID_HEIGHT = 20

// put some fake obstacles in the grid
// start is 0,0 and end is 19,19 (0-based coordinates)
const OBSTACLES: Obstacle[] = [{
    gridCell: { x: 10, z: 17 },
    model: 'Desk',
    orientation: 180,
    positionModifier: { x: 0.4, y: 0, z: 0.2 },
},
{
    gridCell: { x: 3, z: 5 },
    model: 'Desk',
    orientation: 0,
    positionModifier: { x: 0.6, y: 0, z: 0.8 },
}]

const World: React.FC<WorldProps> = ({ username }) => {

    const cameraRef = useRef<THREE.PerspectiveCamera>(null)

    // grid center coordinates
    const gridCenterX = GRID_WIDTH / 2 - 0.5
    const gridCenterZ = GRID_HEIGHT / 2 - 0.5

    // user
    const {
        positionState,
        usersState,
        userIdState,
        occupiedCells,
        initializeUser,
        updateUserPosition,
    } = useUser()

    // pathfinding
    const {
        targetCellState,
        pathState,
        isMovingState,
        setPathState,
        setIsMovingState,
        setTargetCellState,
        handleGridClick
    } = usePathfinding({
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        obstacles: OBSTACLES,
        occupiedCells,
        userPosition: {
            x: positionState?.x ?? 0,
            z: positionState?.z ?? 0,
        }
    })

    useEffect(() => {

        const storedUsername = localStorage.getItem('username') ?? ''

        initializeUser(
            storedUsername,
            OBSTACLES,
            GRID_WIDTH,
            GRID_HEIGHT
        )

    }, [initializeUser])

    useEffect(() => {
        if (pathState.length === 0 || !isMovingState || !positionState) return

        const moveAlongPath = () => {

            const nextCell = pathState[0]
            const newPath = pathState.slice(1)

            // get current grid cell from position
            const currentCell = positionToGridCell(positionState)

            // convert next grid cell to world position
            const nextPosition = gridCellToPosition(nextCell)

            console.log('Moving user to position:', nextPosition, 'from cell', currentCell, 'to cell', nextCell)

            // update user position to the center of the next cell
            updateUserPosition(
                new Vector3(nextPosition.x, nextPosition.y, nextPosition.z),
                currentCell.x,
                currentCell.z,
            )

            setPathState(newPath)

            // check if we've reached the target
            if (newPath.length === 0) {
                setIsMovingState(false)
                setTargetCellState(null)
            }
        }

        // movement delay
        const timer = setTimeout(moveAlongPath, 100)

        return () => {
            clearTimeout(timer)
        }

    }, [pathState, isMovingState, positionState, updateUserPosition, setPathState, setIsMovingState, setTargetCellState])

    return (
        <>
            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                position={[8.4, 4, 24.1]}
                fov={50}
                near={0.1}
                far={50}
                rotation={[0, 0, 0]}
            />
            <Grid
                width={GRID_WIDTH}
                height={GRID_HEIGHT}
                onCellClick={handleGridClick}
                occupiedCells={occupiedCells}
                obstacles={OBSTACLES}
                targetCell={targetCellState}
                path={pathState}
            />
            <Obstacles obstacles={OBSTACLES} />
            {/* current user */}
            <UserAvatar
                x={positionState?.x ?? 0}
                y={positionState?.y ?? 0}
                z={positionState?.z ?? 0}
                username={username}
                color={usersState.find(user => user.id === userIdState)?.color ?? '#3498db'}
                isCurrentUser={true}
            />
            {/* other users */}
            {usersState
                .filter(user => user.id !== userIdState)
                .map((user, index) => (
                    <UserAvatar
                        key={user.id || index}
                        x={user.position.x}
                        y={user.position.y}
                        z={user.position.z}
                        username={user.username}
                        color={user.color}
                        isCurrentUser={false}
                    />
                ))}
            <OrbitControls
                target={[gridCenterX, 0, gridCenterZ]}
            />
        </>
    )
}

export default World
