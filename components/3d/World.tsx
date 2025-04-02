'use client'

import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { Grid } from './Grid'
import { Obstacles } from './Obstacles'
import { UserAvatar } from './UserAvatar'
import { useUser } from '@/hooks/useUser'
import { usePathfinding } from '@/hooks/usePathfinding'
import { GridCell, positionToGridCell, gridCellToPosition } from '@/helpers/grid'

interface WorldProps {
    username: string
}

// grid dimensions: 20x20 = 400 cells
const GRID_WIDTH = 20
const GRID_HEIGHT = 20

// put some fake obstacles in the grid
// start is 0,0 and end is 19,19 (0-based coordinates)
const OBSTACLES: GridCell[] = [
    { x: 19, z: 13 },
    { x: 15, z: 5 },
    { x: 7, z: 15 },
    { x: 3, z: 7 },
    { x: 0, z: 18 },
]

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
    } = useUser()

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

    useEffect(() => {
        // only initialize if userId is empty (meaning we haven't initialized yet)
        if (!userId) {
            const storedUsername = localStorage.getItem('username') ?? username
            if (storedUsername) {
                const { channel } = initializeUser(
                    storedUsername,
                    OBSTACLES,
                    GRID_WIDTH,
                    GRID_HEIGHT
                )

                return () => {
                    void channel.unsubscribe()
                }
            }
        }
    }, [username, initializeUser, userId])

    useEffect(() => {
        if (path.length === 0 || !isMoving) return

        const moveAlongPath = () => {
            const nextCell = path[0]
            const newPath = path.slice(1)

            // get current grid cell from position
            const currentCell = positionToGridCell(position)

            // convert next grid cell to world position
            const nextPosition = gridCellToPosition(nextCell)

            console.log('Moving user to position:', nextPosition, 'from cell', currentCell, 'to cell', nextCell);
            
            // update user position to the center of the next cell
            updateUserPosition(
                new Vector3(nextPosition.x, nextPosition.y, nextPosition.z),
                currentCell.x,
                currentCell.z,
            )

            setPath(newPath)

            // check if we've reached the target
            if (newPath.length === 0) {
                setIsMoving(false)
                setTargetCell(null)
            }
        }

        // movement delay
        const timer = setTimeout(moveAlongPath, 100)

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
            {/* current user */}
            <UserAvatar
                x={position.x}
                y={position.y}
                z={position.z}
                username={username}
                color="#3498db"
                isCurrentUser={true}
            />
            {/* other users */}
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
