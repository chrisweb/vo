'use client'

import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { Grid } from './Grid'
import { Obstacles } from './Obstacles'
import { UserAvatar } from './UserAvatar'
import { useUsers } from '@/lib/useUsers'
import { usePathfinding } from '@/lib/usePathfinding'
import { useKeyboardMovement } from '@/lib/useKeyboardMovement'
import {
    GRID_WIDTH,
    GRID_HEIGHT,
    OBSTACLES,
    positionToCell
} from '@/lib/utils'

interface WorldProps {
    username: string
}

const World: React.FC<WorldProps> = ({ username }) => {
    const controlsRef = useRef(null)

    // user
    const {
        position,
        users,
        userId,
        occupiedCells,
        initializeUser,
        updateUserPosition
    } = useUsers()

    // pathfinding
    const {
        targetCell,
        path,
        isMoving,
        setPath,
        setIsMoving,
        setTargetCell,
        handleGridClick
    } = usePathfinding({
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        obstacles: OBSTACLES,
        occupiedCells,
        userPosition: {
            x: position.x,
            z: position.z
        }
    })

    // keyboard movement
    useKeyboardMovement({
        position,
        isMoving,
        occupiedCells,
        obstacles: OBSTACLES,
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        updatePosition: (newPosition, currentX, currentZ) => {
            updateUserPosition(newPosition, currentX, currentZ, OBSTACLES)
        }
    })

    useEffect(() => {
        const storedUsername = localStorage.getItem('username') ?? username
        if (storedUsername) {
            const { channel, interval } = initializeUser(
                storedUsername,
                OBSTACLES,
                GRID_WIDTH,
                GRID_HEIGHT
            )

            return () => {
                clearInterval(interval)
                void channel.unsubscribe()
            }
        }
    }, [username, initializeUser])

    useEffect(() => {
        if (path.length === 0 || !isMoving) return

        const moveAlongPath = () => {
            const nextCell = path[0]
            const newPath = path.slice(1)
            const [currentX, currentZ] = positionToCell(position)
            const newX = nextCell[0]
            const newZ = nextCell[1]

            updateUserPosition(
                new Vector3(newX + 0.5, 0.5, newZ + 0.5),
                currentX,
                currentZ,
                OBSTACLES
            )

            setPath(newPath)

            // check if we've reached the target
            if (newPath.length === 0) {
                setIsMoving(false)
                setTargetCell(null)
            }
        }

        // movement delay
        const timer = setTimeout(moveAlongPath, 200)

        return () => {
            clearTimeout(timer)
        }

    }, [path, isMoving, position, updateUserPosition, setPath, setIsMoving, setTargetCell])

    return (
        <>
            <Grid
                width={GRID_WIDTH}
                height={GRID_HEIGHT}
                onCellClick={handleGridClick}
                occupiedCells={occupiedCells}
                obstacles={OBSTACLES}
                targetCell={targetCell}
                path={path}
            />
            <Obstacles obstacles={OBSTACLES} />
            {/* Current user */}
            <UserAvatar
                x={position.x}
                y={position.y}
                z={position.z}
                username={username}
                color="#3498db"
                isCurrentUser={true}
            />
            {/* Other users */}
            {users
                .filter(user => user.id !== userId)
                .map((user, index) => (
                    <UserAvatar
                        key={user.id || index}
                        x={user.position.x}
                        y={user.position.y}
                        z={user.position.z}
                        username={user.username}
                        color="#e74c3c"
                        isCurrentUser={false}
                    />
                ))}
            <OrbitControls
                ref={controlsRef}
                target={[GRID_WIDTH / 2 - 0.5, 0, GRID_HEIGHT / 2 - 0.5]}
                minDistance={3}
                maxDistance={20}
                maxPolarAngle={Math.PI / 2 - 0.1}
            />
        </>
    )
}

export default World
