'use client'

import { useCallback, useEffect, useState } from 'react'
import { Vector3 } from 'three'
import { supabaseClient } from '@/utils/supabase'
import { REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES, type RealtimeChannel } from '@supabase/supabase-js'
import { GridCell, cellToString, positionToGridCell, gridCellToPosition } from '@/helpers/grid'
import { v4 as uuidv4 } from 'uuid'
import { serializeVector3, deserializeVector3 } from '@/helpers/vector'

export interface PresenceData {
    id: string
    username: string
}

export interface UserData {
    id: string
    username: string
    position: Vector3
}

interface SerializedUserData {
    id: string
    username: string
    position: {
        x: number
        y: number
        z: number
    }
}

interface PayloadData {
    type: REALTIME_LISTEN_TYPES.BROADCAST | REALTIME_LISTEN_TYPES.POSTGRES_CHANGES | REALTIME_LISTEN_TYPES.PRESENCE
    event: string
    payload: SerializedUserData
}

const newUserId = uuidv4()

export const useUser = () => {

    const [positionState, setPositionState] = useState<Vector3>(new Vector3(0, 0, 0))
    const [presencesState, setPresencesState] = useState<PresenceData[]>([])
    const [usersState, setUsersState] = useState<UserData[]>([])
    const [userIdState, setUserIdState] = useState<string | null>(null)
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)
    const [lastBroadcastedPositionState, setLastBroadcastedPositionState] = useState<Vector3 | null>(null)

    // using set instead of array (as we don't want to have duplicates anyway)
    // sets are much faster for lookups than arrays
    const [occupiedCells, setOccupiedCells] = useState<Set<string>>(new Set())

    const getRandomCellPosition = useCallback(
        (
            existingUsers: UserData[],
            obstacles: GridCell[],
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

                // TODO: update needed, this code should get handled by pathfinding.js
                // check if cell is occupied or has an obstacle
                const cellKey = cellToString(randomCell)
                const isObstacle = obstacles.some(obs =>
                    obs.x === randomCell.x && obs.z === randomCell.z
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
        obstacles: GridCell[],
        gridWidth: number,
        gridHeight: number
    ) => {

        if (userIdState) return

        setUserIdState(newUserId)

        const randomPosition = getRandomCellPosition([], obstacles, gridWidth, gridHeight)

        setPositionState(randomPosition)
        setLastBroadcastedPositionState(randomPosition)

        const newUser: UserData = {
            id: newUserId,
            username,
            position: randomPosition,
        }

        setUsersState(currentUsers => [...currentUsers, newUser])

        const cell = positionToGridCell(randomPosition)
        const cellKey = cellToString(cell)

        setOccupiedCells(() => {
            const newSet = new Set<string>()
            newSet.add(cellKey)
            return newSet
        })

        // create a channel with a specific room ID to ensure all users connect to the same space
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

        console.log('Channel created:', channel)

        channel.subscribe((status, error) => {

            console.log('Channel subscription status update:', status)
            console.log('error:', error)

            if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {

                console.log('Successfully subscribed to channel')

                setChannelState(channel)

                // Track presence to keep the connection alive
                const presenceData = {
                    username: username,
                    id: newUserId,
                }

                channel.track(presenceData).then(() => {
                    console.log('Presence tracked successfully')

                    console.log('// Broadcast initial position to all users')
                    channel.send({
                        type: 'broadcast',
                        event: 'position',
                        payload: {
                            id: newUserId,
                            username,
                            position: serializeVector3(randomPosition)
                        }
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
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
                console.error('Channel subscription timed out')
            }
        })

        // @ts-ignore types problem
        channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event: 'position' }, (payload: PayloadData) => {

            console.log('####### Received position update:', payload)

            const position = deserializeVector3(payload.payload.position)

            setUsersState((prev) => {
                // update user position if they exist, else insert new position
                const userExists = prev.some(user =>
                    user.id === payload.payload.id
                )

                if (userExists) {
                    // find the user's previous position before updating
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

                    // Update the user state with new position
                    return prev.map(user =>
                        user.id === payload.payload.id ?
                            {
                                ...user,
                                position,
                            } :
                            user
                    )
                } else {
                    // new user joining, add them to the list
                    // For new users, just add their position to occupied cells
                    const cell = positionToGridCell(position)
                    const cellKey = cellToString(cell)

                    setOccupiedCells((prevCells) => {
                        const newSet = new Set(prevCells)
                        newSet.add(cellKey)
                        return newSet
                    })

                    return [...prev, {
                        id: payload.payload.id,
                        username: payload.payload.username,
                        position
                    }]
                }
            })
        })

        // presence state changes for all users
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: 'sync' }, () => {
            const state = channel.presenceState()
            console.log('Current presence state:', state)
        })

        // users joining
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: 'join' }, ({ key, newPresences }) => {
            console.log(`User ${key} joined`, newPresences)

            newPresences.forEach((presence) => {

                setPresencesState((prev) => {

                    const userExists = prev.some(user => user.id === presence.id)

                    if (!userExists) {
                        return [...prev, {
                            id: String(presence.id),
                            username: String(presence.username),
                        }]
                    } else {
                        return prev
                    }

                })

            })

            // on new presence, we share position with them
            if (userIdState) {
                const currentUserData = {
                    id: newUserId,
                    username,
                    position: serializeVector3(positionState),
                }

                channel.send({
                    type: 'broadcast',
                    event: 'position',
                    payload: currentUserData
                }).catch((error: unknown) => {
                    console.error('Failed to send initial position to new user', error)
                })
            }
        })

        // users leaving
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: 'leave' }, ({ key, leftPresences }) => {
            console.log(`User ${key} left`, leftPresences)
            // remove user who left
            setUsersState(prev => prev.filter(user => user.id !== key))

            setPresencesState((prev) => {
                return prev.filter(user => user.id !== key)
            })

            // clean up occupied cells when a user leaves
            setOccupiedCells((prev) => {
                const newSet = new Set(prev)
                const userLeaving = usersState.find(user => user.id === key)
                if (userLeaving) {
                    const cell = positionToGridCell(userLeaving.position)
                    newSet.delete(cellToString(cell))
                }
                return newSet
            })
        })

        return { channel: channel }

    }, [getRandomCellPosition, userIdState, usersState, positionState])

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

    // broadcast position updates only when position changes
    useEffect(() => {
        if (!channelState || !userIdState || !lastBroadcastedPositionState) return

        // check if position has changed since last broadcast
        if (positionState === lastBroadcastedPositionState) {
            return
        }

        const currentUser = usersState.find(user => user.id === userIdState)
        if (!currentUser) return

        // serialize the position for transmission
        const serializedPosition = serializeVector3(positionState)

        const userData = {
            id: userIdState,
            username: currentUser.username,
            position: serializedPosition
        }

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

        setLastBroadcastedPositionState(positionState)

    }, [channelState, userIdState, positionState, lastBroadcastedPositionState, usersState])

    return {
        positionState,
        usersState,
        userIdState,
        occupiedCells,
        presencesState,
        initializeUser,
        unsubscribeUser,
        updateUserPosition
    }
}