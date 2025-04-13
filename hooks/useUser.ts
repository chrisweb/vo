'use client'

import { useCallback, useEffect, useState/*, useRef*/ } from 'react'
import { Vector3 } from 'three'
import { supabaseClient } from '@/utils/supabase'
import { REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES, REALTIME_PRESENCE_LISTEN_EVENTS, type RealtimeChannel } from '@supabase/supabase-js'
import { GridCell, cellToString, positionToGridCell, gridCellToPosition } from '@/helpers/grid'
import { v4 as uuidv4 } from 'uuid'
import { serializeVector3, deserializeVector3 } from '@/helpers/vector'
import { type Obstacle } from '@/components/3d/Obstacles'

// static configuration variables for channel retry behavior
//const MAX_RETRY_ATTEMPTS = 3
//const RETRY_TIMEOUT_MS = 2000


// colors for user avatars
export const USER_COLORS = [
    '#3498db', // Blue
    '#e74c3c', // Red
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Teal
    '#f1c40f', // Yellow
    '#e67e22', // Dark Orange
    '#34495e', // Navy Blue
    '#16a085', // Dark Cyan
]

export interface UserData {
    id: string
    username: string
    position: Vector3
    color: string
}

interface SerializedUserData {
    id: string
    username: string
    position: {
        x: number
        y: number
        z: number
    }
    color: string
}

interface PayloadData {
    type: REALTIME_LISTEN_TYPES.BROADCAST | REALTIME_LISTEN_TYPES.POSTGRES_CHANGES | REALTIME_LISTEN_TYPES.PRESENCE
    event: string
    payload: SerializedUserData
}

interface JoinPresenceData {
    key: string
    newPresences: SerializedUserData[]
}

interface LeftPresenceData {
    key: string
    leftPresences: SerializedUserData[]
}

const newUserId = uuidv4()

export const useUser = () => {
    const [positionState, setPositionState] = useState<Vector3 | null>(null)
    const [colorState, setColorState] = useState<string | null>(null)
    const [usersState, setUsersState] = useState<UserData[]>([])
    const [userIdState, setUserIdState] = useState<string | null>(null)
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)
    const [lastBroadcastedPositionState, setLastBroadcastedPositionState] = useState<Vector3 | null>(null)

    // use refs for tracking retry attempts and timeout IDs
    //const retryAttemptsRef = useRef<number>(0)
    //const retryTimeoutIdRef = useRef<NodeJS.Timeout | null>(null)

    // using set instead of array (as we don't want to have duplicates anyway)
    // sets are much faster for lookups than arrays
    const [occupiedCells, setOccupiedCells] = useState<Set<string>>(new Set())

    const getRandomCellPosition = useCallback(
        (
            existingUsers: UserData[],
            obstacles: Obstacle[],
            gridWidth: number,
            gridHeight: number
        ): Vector3 => {

            // TODO: maybe instead of setting a default value
            // if we can't find a cell we throw an error????
            let randomCell: GridCell = { x: 0, z: 0 }
            let positionFound = false

            // track occupied cells
            const occupied = new Set<string>(occupiedCells)
            existingUsers.forEach((user) => {
                const cell = positionToGridCell(user.position)
                occupied.add(cellToString(cell))
            })

            while (!positionFound) {
                // generate random cell coordinates (0 to gridWidth-1, 0 to gridHeight-1)
                const x = Math.floor(Math.random() * gridWidth)
                const z = Math.floor(Math.random() * gridHeight)
                randomCell = { x, z }

                // TODO: update needed?, this code should get handled by pathfinding.js
                // check if cell is occupied or has an obstacle
                const cellKey = cellToString(randomCell)
                const isObstacle = obstacles.some(obstacle =>
                    obstacle.gridCell.x === randomCell.x && obstacle.gridCell.z === randomCell.z
                )

                if (!occupied.has(cellKey) && !isObstacle) {
                    positionFound = true
                }
            }

            const worldPos = gridCellToPosition(randomCell)

            return new Vector3(worldPos.x, worldPos.y, worldPos.z)
        },
        [occupiedCells]
    )
    const initializeUser = useCallback((
        username: string,
        obstacles: Obstacle[],
        gridWidth: number,
        gridHeight: number
    ) => {

        if (userIdState) return

        setUserIdState(newUserId)

        const randomPosition = getRandomCellPosition([], obstacles, gridWidth, gridHeight)

        setPositionState(randomPosition)
        setLastBroadcastedPositionState(randomPosition)

        const randomColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]

        setColorState(randomColor)

        const userData: UserData = {
            id: newUserId,
            username,
            position: randomPosition,
            color: randomColor
        }

        setUsersState(currentUsers => [...currentUsers, userData])

        const cell = positionToGridCell(randomPosition)
        const cellKey = cellToString(cell)

        setOccupiedCells(() => {
            const newSet = new Set<string>()
            newSet.add(cellKey)
            return newSet
        })

        // create a channel with a specific room ID
        // TODO: in the future this ID would come from a db query and
        // would be unique for each virtual world
        const channel = supabaseClient.channel('virtual-world', {
            config: {
                presence: {
                    key: newUserId,
                },
                broadcast: {
                    self: false
                }
            }
        })

        // retry attempts reset
        /*retryAttemptsRef.current = 0
        if (retryTimeoutIdRef.current) {
            clearTimeout(retryTimeoutIdRef.current)
            retryTimeoutIdRef.current = null
        }*/

        console.log('Channel created:', channel)

        channel.subscribe((status, error) => {

            console.log('Channel subscription status update:', status)
            console.log('error:', error)

            if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
                console.log('Successfully subscribed to channel')

                // reset retry counter on successful connection
                /*retryAttemptsRef.current = 0
                if (retryTimeoutIdRef.current) {
                    clearTimeout(retryTimeoutIdRef.current)
                    retryTimeoutIdRef.current = null
                }*/

                setChannelState(channel)

                channel.track(userData).then(() => {
                    console.log('Presence tracked successfully')

                    console.log('+++++++++ Broadcast initial position to all users', userData)
                    channel.send({
                        type: 'broadcast',
                        event: 'position',
                        payload: userData
                    }).catch((error: unknown) => {
                        console.error('Failed to send initial position', error)
                    })
                }).catch((error: unknown) => {
                    console.error('Failed to track presence', error)
                })

            } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {

                console.log('Channel closed unexpectedly')
                setChannelState(null)

            } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
                console.error('Channel error occurred')

                /*if (retryAttemptsRef.current < MAX_RETRY_ATTEMPTS) {

                    console.log(`Attempting to retry channel subscription in ${(RETRY_TIMEOUT_MS / 1000).toString()} seconds... (Attempt ${(retryAttemptsRef.current + 1).toString()} of ${MAX_RETRY_ATTEMPTS.toString()})`)

                    retryAttemptsRef.current += 1

                    if (retryTimeoutIdRef.current) {
                        clearTimeout(retryTimeoutIdRef.current)
                    }

                    retryTimeoutIdRef.current = setTimeout(() => {
                        console.log('Executing retry for channel subscription')
                        channel.subscribe()
                    }, RETRY_TIMEOUT_MS)
                } else {
                    console.error(`Maximum number of retry attempts (${MAX_RETRY_ATTEMPTS.toString()}) reached. Giving up on channel reconnection.`)
                }*/

                setChannelState(null)

                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
                console.error('Channel subscription timed out')
            }

            return
        })

        // @ts-ignore TODO: types problem
        channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event: 'position' }, (payload: PayloadData) => {

            console.log('####### Received position update:', payload)

            const position = deserializeVector3(payload.payload.position)

            setUsersState((prev) => {
                // update user position if they exist, else insert new position
                const userExists = prev.some(user =>
                    user.id === payload.payload.id
                )

                if (userExists) {
                    // existing user, update their state
                    const previousUser = prev.find(user => user.id === payload.payload.id)

                    if (previousUser) {
                        const previousCell = positionToGridCell(previousUser.position)
                        const previousCellKey = cellToString(previousCell)

                        // update occupied cells
                        // remove previous cell and add new cell
                        setOccupiedCells((prevCells) => {
                            const newSet = new Set(prevCells)
                            newSet.delete(previousCellKey)

                            const newCell = positionToGridCell(position)
                            const newCellKey = cellToString(newCell)
                            newSet.add(newCellKey)

                            return newSet
                        })
                    }

                    // update the user state with new position
                    return prev.map(user =>
                        user.id === payload.payload.id ?
                            {
                                ...user,
                                position,
                            } :
                            user
                    )
                } else {
                    // new user joined, add them to the state
                    const cell = positionToGridCell(position)
                    const cellKey = cellToString(cell)

                    if (positionState && colorState) {

                        // on new presence, we share position with them
                        const userData = {
                            id: newUserId,
                            username,
                            position: serializeVector3(positionState),
                            color: colorState
                        }

                        console.log('+++++++++ broadcasting position update for new user(s)', userData)

                        channel.send({
                            type: 'broadcast',
                            event: 'position',
                            payload: userData
                        }).catch((error: unknown) => {
                            console.error('Failed to send initial position to new user', error)
                        })

                    }

                    setOccupiedCells((prevCells) => {
                        const newSet = new Set(prevCells)
                        newSet.add(cellKey)
                        return newSet
                    })
                    return [...prev, {
                        id: payload.payload.id,
                        username: payload.payload.username,
                        position,
                        color: payload.payload.color
                    }]
                }
            })
        })

        // presence state changes for all users
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC }, () => {
            const state = channel.presenceState()
            console.log('Current presence state:', state)
        })

        // users joining
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: 'join' }, ({ key, newPresences }: JoinPresenceData) => {

            console.log(`PRESENCE user(s) ${key} joined`, newPresences)

            newPresences.forEach((presence) => {

                setUsersState((prev) => {

                    const userExists = prev.some(user => user.id === presence.id)

                    if (!userExists) {
                        return [...prev, {
                            id: String(presence.id),
                            username: String(presence.username),
                            position: deserializeVector3(presence.position),
                            color: presence.color || USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
                        }]
                    } else {
                        return prev
                    }

                })

                setOccupiedCells((prevCells) => {
                    const newSet = new Set(prevCells)
                    const newCell = positionToGridCell(presence.position)
                    const newCellKey = cellToString(newCell)
                    newSet.add(newCellKey)
                    return newSet
                })

            })

        })

        // users leaving
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: 'leave' }, ({ key, leftPresences }: LeftPresenceData) => {
            console.log(`PRESENCE user(s)? ${key} left`, leftPresences)

            leftPresences.forEach((presence) => {

                // remove user who left
                setUsersState(prev => prev.filter(user => user.id !== presence.id))

                setOccupiedCells((prevCells) => {
                    const newSet = new Set(prevCells)
                    const cell = positionToGridCell(presence.position)
                    const newCellKey = cellToString(cell)
                    newSet.delete(newCellKey)
                    return newSet
                })
            })
        })

        return { channel: channel }

    }, [getRandomCellPosition, userIdState, positionState, colorState])

    const unsubscribeUser = useCallback(() => {
        if (channelState) {
            supabaseClient.removeChannel(channelState).catch((error: unknown) => {
                console.error('Failed to remove channel', error)
            })
            setChannelState(null)
        }
    }, [channelState])

    // update user position when moving
    const updateUserPosition = useCallback((
        newPosition: Vector3,
        currentX: number,
        currentZ: number,
    ) => {
        // get new grid cell
        const newCell = positionToGridCell(newPosition)

        // create current cell from the passed coordinates
        const currentCell: GridCell = { x: currentX, z: currentZ }

        // update occupied cells
        setOccupiedCells((prev) => {
            const newSet = new Set(prev)
            newSet.delete(cellToString(currentCell))
            newSet.add(cellToString(newCell))
            return newSet
        })

        setPositionState(newPosition)
    }, [])

    // broadcast update when position changes
    useEffect(() => {
        if (!channelState || !userIdState || !lastBroadcastedPositionState) return

        // check if position has changed since last broadcast
        if (positionState === lastBroadcastedPositionState) {
            return
        }

        const currentUser = usersState.find(user => user.id === userIdState)

        if (!positionState || !currentUser) return

        // serialize the position for transmission
        const serializedPosition = serializeVector3(positionState)

        const userData = {
            id: currentUser.id,
            username: currentUser.username,
            position: serializedPosition,
            color: currentUser.color
        }

        console.log('+++++++++ broadcasting position update because position changed:', userData)

        // broadcast position update to all users
        channelState.send({
            type: 'broadcast',
            event: 'position',
            payload: userData
        }).catch((error: unknown) => {
            console.error('Failed to send position update', error)
            return
        })

        console.log('Broadcasting position update:', userData)

        setUsersState((prev) => {
            // update the user state with new position
            return prev.map(user =>
                user.id === userIdState ?
                    {
                        ...user,
                        serializedPosition,
                    } :
                    user
            )
        })

        setLastBroadcastedPositionState(positionState)

    }, [channelState, userIdState, positionState, lastBroadcastedPositionState, usersState])

    return {
        positionState,
        usersState,
        userIdState,
        occupiedCells,
        initializeUser,
        unsubscribeUser,
        updateUserPosition
    }
}