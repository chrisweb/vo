'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { Cylinder, OrbitControls, Text } from '@react-three/drei'
import PF from 'pathfinding'
import { Vector3 } from 'three'
import { supabase } from '@/utils/supabase'
import { REALTIME_LISTEN_TYPES } from '@supabase/supabase-js'

interface UserData {
    id: string
    username: string
    position: Vector3
}

interface PayloadData {
    type: REALTIME_LISTEN_TYPES.BROADCAST | REALTIME_LISTEN_TYPES.POSTGRES_CHANGES | REALTIME_LISTEN_TYPES.PRESENCE
    event: string
    payload: UserData
}

// Grid dimensions
const GRID_WIDTH = 10
const GRID_HEIGHT = 10

// Create fixed obstacles
const OBSTACLES = [
    { x: 2, z: 3 },
    { x: 5, z: 5 },
    { x: 7, z: 2 },
    { x: 3, z: 7 },
    { x: 8, z: 8 },
]

interface IProps extends React.PropsWithChildren {
    username: string
}

const World: React.FC<IProps> = ({ username }) => {
    const [position, setPosition] = useState<Vector3>(
        new Vector3(0.5, 0.5, 0.5),
    )
    const [users, setUsers] = useState<UserData[]>([])
    const controlsRef = useRef(null)
    const [userId, setUserId] = useState('')
    const [occupiedCells, setOccupiedCells] = useState<Set<string>>(new Set())
    const [targetCell, setTargetCell] = useState<[number, number] | null>(null)
    const [path, setPath] = useState<number[][]>([])
    const [isMoving, setIsMoving] = useState(false)
    const [grid, setGrid] = useState<PF.Grid | null>(null)
    const [finder, setFinder] = useState<PF.AStarFinder | null>(null)

    // Function to get a random position in the center of a cell that's not occupied
    const getRandomCellPosition = useCallback(
        (existingUsers: UserData[]): Vector3 => {
            let x = 0
            let z = 0
            let positionFound = false

            // Track occupied cells
            const occupied = new Set<string>(occupiedCells)
            existingUsers.forEach((user) => {
                const cellX = Math.floor(user.position.x)
                const cellZ = Math.floor(user.position.z)
                occupied.add(`${cellX.toString()},${cellZ.toString()}`)
            })

            while (!positionFound) {
                // Generate random cell coordinates (0-9 for both x and z)
                x = Math.floor(Math.random() * GRID_WIDTH)
                z = Math.floor(Math.random() * GRID_HEIGHT)

                // Check if cell is occupied or has an obstacle
                const cellKey = `${x.toString()},${z.toString()}`
                const isObstacle = OBSTACLES.some(obs =>
                    obs.x === x && obs.z === z
                )

                if (!occupied.has(cellKey) && !isObstacle) {
                    positionFound = true
                }
            }

            // Return the center of the cell (x+0.5, 0.5, z+0.5)
            return new Vector3(x + 0.5, 0.5, z + 0.5)
        },
        [occupiedCells],
    )

    // Initialize pathfinding grid and finder
    useEffect(() => {
        // Create a new grid
        const newGrid = new PF.Grid(GRID_WIDTH, GRID_HEIGHT)

        // Mark obstacles as unwalkable
        OBSTACLES.forEach((obstacle) => {
            newGrid.setWalkableAt(obstacle.x, obstacle.z, false)
        })

        setGrid(newGrid)

        // Create a new pathfinder with compatible options
        const newFinder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.Never,
        })

        setFinder(newFinder)

        // Add obstacles to occupied cells
        const newOccupiedCells = new Set<string>()
        OBSTACLES.forEach((obstacle) => {
            newOccupiedCells.add(
                `${obstacle.x.toString()},${obstacle.z.toString()}`,
            )
        })

        setOccupiedCells(newOccupiedCells)
    }, [])

    useEffect(() => {
        // Get username from localStorage
        const storedUsername = localStorage.getItem('username')
        if (storedUsername && grid) {
            // Create a user ID
            const newUserId = Math.random().toString(36).substring(2, 9)
            setUserId(newUserId)

            // Generate a random position that's not occupied
            const randomPosition = getRandomCellPosition([])
            setPosition(randomPosition)

            // Add user to the list
            const newUser: UserData = {
                id: newUserId,
                username: storedUsername,
                position: randomPosition,
            }
            setUsers(currentUsers => [...currentUsers, newUser])

            // Mark cell as occupied
            const cellKey = `${Math.floor(randomPosition.x).toString()},${
                Math.floor(randomPosition.z).toString()
            }`
            setOccupiedCells((prev) => {
                const newSet = new Set(prev)
                newSet.add(cellKey)
                return newSet
            })

            // Subscribe to position updates
            const channel = supabase.channel('virtual-world')

            // @ts-ignore Argument of type '"broadcast"' is not assignable to parameter of type '"system"'
            channel.on('broadcast', { event: 'position' }, (payload: PayloadData) => {
                setUsers((prev) => {
                    // Update user position if they exist, otherwise add them
                    const userExists = prev.some(user =>
                        user.id === payload.payload.id
                    )

                    if (userExists) {
                        return prev.map(user =>
                            user.id === payload.payload.id ?
                                {
                                    ...user,
                                    position: payload.payload.position,
                                } :
                                user
                        )
                    } else {
                        return [...prev, payload.payload]
                    }
                })

                // Update occupied cells
                setOccupiedCells((prev) => {
                    const newSet = new Set(prev)
                    const pos = payload.payload.position
                    const cellKey = `${Math.floor(pos.x).toString()},${Math.floor(pos.z).toString()}`
                    newSet.add(cellKey)
                    return newSet
                })
            }).subscribe()

            // Broadcast initial position
            const initialPosition: PayloadData = {
                type: REALTIME_LISTEN_TYPES.BROADCAST,
                event: 'position',
                payload: newUser,
            }

            channel.send(initialPosition).catch(() => {
                console.error('Failed to send position update')
            })

            // Set up interval to broadcast position updates
            const interval = setInterval(() => {
                const userData = {
                    id: newUserId,
                    username: storedUsername,
                    position,
                }
                const newPosition: PayloadData = {
                    type: REALTIME_LISTEN_TYPES.BROADCAST,
                    event: 'position',
                    payload: userData,
                }
                channel.send(newPosition).catch(() => {
                    console.error('Failed to send position update')
                })
            }, 1000)

            return () => {
                void (async function () {
                    clearInterval(interval)
                    await channel.unsubscribe()
                })()
            }
        }
    }, [grid, getRandomCellPosition, position])

    // Pathfinding function using PathFinding.js
    const findPathWithLibrary = useCallback((
        startX: number,
        startZ: number,
        targetX: number,
        targetZ: number,
    ) => {
        if (!grid || !finder) return []

        // If cells are the same, return empty path
        if (startX === targetX && startZ === targetZ) return []

        // If target cell has an obstacle, return empty path
        const isTargetObstacle = OBSTACLES.some(obs =>
            obs.x === targetX && obs.z === targetZ
        )
        if (isTargetObstacle) return []

        // If target cell is occupied by another user, return empty path
        const targetCellKey = `${targetX.toString()},${targetZ.toString()}`
        const isOccupiedByUser = occupiedCells.has(targetCellKey) &&
            !(targetX === Math.floor(position.x) &&
                targetZ === Math.floor(position.z))

        if (isOccupiedByUser) return []

        // Clone the grid to avoid modifying the original
        const gridClone = grid.clone()

        // Mark cells occupied by other users as unwalkable
        occupiedCells.forEach((cell) => {
            const [x, z] = cell.split(',').map(Number)
            // Skip current user position
            const isCurrentUserPos = x === Math.floor(position.x) &&
                z === Math.floor(position.z)

            if (!isCurrentUserPos) {
                gridClone.setWalkableAt(x, z, false)
            }
        })

        // Make sure target is walkable
        gridClone.setWalkableAt(targetX, targetZ, true)

        // Find path
        const pfPath = finder.findPath(
            startX,
            startZ,
            targetX,
            targetZ,
            gridClone,
        )

        // Convert path format and remove the starting position
        return pfPath.slice(1).map(point => [point[0], point[1]])
    }, [grid, finder, occupiedCells, position])

    // Handle grid click
    const handleGridClick = useCallback(
        (x: number, z: number) => {
            if (isMoving) return

            // Check if target cell has an obstacle
            const isObstacle = OBSTACLES.some(obs =>
                obs.x === x && obs.z === z
            )
            if (isObstacle) return

            const startX = Math.floor(position.x)
            const startZ = Math.floor(position.z)

            // Find path to target using PathFinding.js
            const newPath = findPathWithLibrary(startX, startZ, x, z)

            if (newPath.length > 0) {
                setTargetCell([x, z])
                setPath(newPath)
                setIsMoving(true)
            }
        },
        [position, isMoving, findPathWithLibrary],
    )

    // Handle automatic movement along path
    useEffect(() => {
        if (path.length === 0 || !isMoving) return

        const moveAlongPath = () => {
            const nextCell = path[0]
            const newPath = path.slice(1)

            // Get current cell coordinates
            const currentX = Math.floor(position.x)
            const currentZ = Math.floor(position.z)

            // Calculate new cell
            const newX = nextCell[0]
            const newZ = nextCell[1]

            // Update occupied cells
            setOccupiedCells((prev) => {
                const newSet = new Set(prev)
                // Remove old cell if it's not an obstacle
                if (
                    !OBSTACLES.some(obs =>
                        obs.x === currentX && obs.z === currentZ
                    )
                ) {
                    newSet.delete(
                        `${currentX.toString()},${currentZ.toString()}`,
                    )
                }
                // Add new cell
                newSet.add(`${newX.toString()},${newZ.toString()}`)
                return newSet
            })

            // Set new position to center of cell
            setPosition(new Vector3(newX + 0.5, 0.5, newZ + 0.5))

            // Update path
            setPath(newPath)

            // Check if we've reached the target
            if (newPath.length === 0) {
                setIsMoving(false)
                setTargetCell(null)
            }
        }

        // Move with a delay
        const timer = setTimeout(moveAlongPath, 200)

        return () => {
            clearTimeout(timer)
        }
    }, [path, isMoving, position])

    // Handle keyboard movement
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
                newX >= 0 && newX < GRID_WIDTH && newZ >= 0 &&
                newZ < GRID_HEIGHT
            ) {
                // Check if the new cell is occupied by another user or obstacle
                const cellKey = `${newX.toString()},${newZ.toString()}`
                const isObstacle = OBSTACLES.some(obs =>
                    obs.x === newX && obs.z === newZ
                )

                if (
                    (!occupiedCells.has(cellKey) ||
                        (newX === currentX && newZ === currentZ)) && !isObstacle
                ) {
                    // Update occupied cells
                    setOccupiedCells((prev) => {
                        const newSet = new Set(prev)
                        // Remove old cell if it's not an obstacle
                        if (
                            !OBSTACLES.some(obs =>
                                obs.x === currentX && obs.z === currentZ
                            )
                        ) {
                            newSet.delete(
                                `${currentX.toString()},${currentZ.toString()}`,
                            )
                        }
                        // Add new cell
                        newSet.add(cellKey)
                        return newSet
                    })

                    // Set new position to center of cell
                    setPosition(new Vector3(newX + 0.5, 0.5, newZ + 0.5))
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [position, occupiedCells, isMoving])

    // Update users list when position changes
    useEffect(() => {
        if (userId) {
            setUsers(prev =>
                prev.map(user => (user.id === userId ? { ...user, position } : user)
                )
            )
        }
    }, [position, userId])

    // Add visual feedback for obstacles in the UI
    return (
        <>
            {/* Grid click handler */}
            <ClickableGrid onCellClick={handleGridClick} />

            {/* Custom grid with cell lines */}
            <group
                position={[GRID_WIDTH / 2 - 0.5, 0, GRID_HEIGHT / 2 - 0.5]}
            >
                <gridHelper
                    args={[GRID_WIDTH, GRID_WIDTH, '#444', '#222']}
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                />
            </group>

            {/* Ground plane */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[
                    GRID_WIDTH / 2 - 0.5,
                    -0.01,
                    GRID_HEIGHT / 2 - 0.5,
                ]}
                receiveShadow
            >
                <planeGeometry args={[GRID_WIDTH, GRID_HEIGHT]} />
                <meshStandardMaterial color="#111" />
            </mesh>

            {/* Grid cell visualization */}
            {Array.from({ length: GRID_WIDTH * GRID_HEIGHT }).map(
                (_, index) => {
                    const x = index % GRID_WIDTH
                    const z = Math.floor(index / GRID_WIDTH)
                    const cellKey = `${x.toString()},${z.toString()}`
                    const isOccupied = occupiedCells.has(cellKey)
                    const isObstacle = OBSTACLES.some(obs =>
                        obs.x === x && obs.z === z
                    )
                    const isTarget = targetCell && targetCell[0] === x &&
                        targetCell[1] === z
                    const isPathCell = path.some(cell =>
                        cell[0] === x && cell[1] === z
                    )

                    let cellColor = '#22222210'
                    if (isTarget) cellColor = '#2563eb40'
                    else if (isPathCell) cellColor = '#3b82f620'
                    else if (isObstacle) {
                        cellColor = '#7c2d12' // Don't show obstacles here, we'll use 3D objects
                    } else if (isOccupied) cellColor = '#1a365d20'

                    return (
                        <mesh
                            key={index}
                            position={[x + 0.5, 0, z + 0.5]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <planeGeometry args={[0.95, 0.95]} />
                            <meshBasicMaterial
                                color={cellColor}
                                transparent={true}
                                opacity={isTarget || isPathCell ? 0.7 : 0.3}
                            />
                        </mesh>
                    )
                },
            )}

            {/* Obstacles (cylinders) */}
            {OBSTACLES.map((obstacle, index) => (
                <group
                    key={`obstacle-${index.toString()}`}
                    position={[obstacle.x + 0.5, 0, obstacle.z + 0.5]}
                >
                    <Cylinder
                        position={new Vector3(0, 0.75, 0)}
                        args={[0.4, 0.4, 1.5, 16]}
                        castShadow
                    >
                        <meshStandardMaterial color="#7c2d12" />
                    </Cylinder>
                    <Text
                        position={new Vector3(0, 1.8, 0)}
                        fontSize={0.3}
                        color="white"
                        anchorX="center"
                        anchorY="middle"
                    >
                        Obstacle
                    </Text>
                </group>
            ))}

            {/* Current user */}
            <UserAvatar
                position={position}
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
                        position={user.position}
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

function UserAvatar({
    position,
    username,
    color,
    isCurrentUser,
}: {
    position: Vector3
    username: string
    color: string
    isCurrentUser: boolean
}) {
    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[0.8, 1, 0.8]} />
                <meshStandardMaterial color={color} />
            </mesh>
            <Text
                position={new Vector3(0, 1.5, 0)}
                fontSize={0.4}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {username} {isCurrentUser ? '(You)' : ''}
            </Text>
        </group>
    )
}

// Grid click handler component
function ClickableGrid(
    { onCellClick }: { onCellClick: (x: number, z: number) => void },
) {
    const { camera, raycaster, pointer, scene } = useThree()

    // Handle click events
    useEffect(() => {
        const handleClick = () => {
            // Update the raycaster with the current mouse position
            raycaster.setFromCamera(pointer, camera)

            // Calculate objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(scene.children, true)

            // Find the first intersection with a grid cell
            for (const intersect of intersects) {
                // Check if it's a grid cell (plane)
                if (
                    intersect.object.type === 'Mesh' &&
                    intersect.object.position.y === 0
                ) {
                    // Get the cell coordinates
                    const x = Math.floor(intersect.object.position.x)
                    const z = Math.floor(intersect.object.position.z)

                    // Call the click handler
                    onCellClick(x, z)
                    break
                }
            }
        }

        // Add click event listener
        window.addEventListener('click', handleClick)

        return () => {
            window.removeEventListener('click', handleClick)
        }
    }, [camera, raycaster, pointer, scene, onCellClick])

    return null
}
