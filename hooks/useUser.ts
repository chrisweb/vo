'use client'

import { useCallback, useEffect, useState } from 'react'
import { Vector3 } from 'three'
import { supabase } from '@/utils/supabase'
import { REALTIME_LISTEN_TYPES, REALTIME_PRESENCE_LISTEN_EVENTS, type RealtimeChannel } from '@supabase/supabase-js'
import { GridCell, cellToString, positionToGridCell, gridCellToPosition } from '@/helpers/grid'
import { v4 as uuidv4 } from 'uuid'
import { serializeVector3, deserializeVector3 } from '@/helpers/vector'

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

export const useUser = () => {

    const [positionState, setPositionState] = useState<Vector3>(new Vector3(0, 0, 0))
    const [usersState, setUsersState] = useState<UserData[]>([])
    const [userIdState, setUserIdState] = useState('')
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

        const newUserId = uuidv4()
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

        setOccupiedCells((prev) => {
            const newSet = new Set(prev)
            newSet.add(cellKey)
            return newSet
        })

        // create a channel with a specific room ID to ensure all users connect to the same space
        const channel = supabase.channel('virtual-world', {
            config: {
                presence: {
                    key: newUserId,
                },
                broadcast: {
                    self: false
                }
            }
        })

        // presence state changes for all users
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: REALTIME_PRESENCE_LISTEN_EVENTS.SYNC }, () => {
            const state = channel.presenceState()
            console.log('Current presence state:', state)
        })

        // users joining
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: REALTIME_PRESENCE_LISTEN_EVENTS.JOIN }, ({ key }) => {
            console.log(`User ${key} joined`)

            // ask new users to share their position by broadcasting our position
            if (channelState) {
                const currentUserData = {
                    id: newUserId,
                    username,
                    position: serializeVector3(randomPosition)
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
        channel.on(REALTIME_LISTEN_TYPES.PRESENCE, { event: REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE }, ({ key }) => {
            console.log(`User ${key} left`)
            // remove user who left
            setUsersState(prev => prev.filter(user => user.id !== key))

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

        // @ts-ignore types problem
        channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event: 'position' }, (payload: PayloadData) => {
            console.log('Received position update:', payload)

            const position = deserializeVector3(payload.payload.position)

            setUsersState((prev) => {
                // update user position if they exist, else insert new position
                const userExists = prev.some(user =>
                    user.id === payload.payload.id
                )

                if (userExists) {
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
                    return [...prev, {
                        id: payload.payload.id,
                        username: payload.payload.username,
                        position
                    }]
                }
            })

            // update occupied cells
            setOccupiedCells((prev) => {
                const newSet = new Set(prev)
                const cell = positionToGridCell(position)
                const cellKey = cellToString(cell)
                newSet.add(cellKey)
                return newSet
            })
        })

        channel.subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to channel')

                // update presence with user data
                const presenceData = {
                    username: username,
                    position: serializeVector3(randomPosition)
                }

                channel.track(presenceData).then(() => {
                    console.log('Presence tracked successfully')
                }).catch((error: unknown) => {
                    console.error('Failed to track presence', error)
                })

                // broadcast initial position to all users with serialized position
                channel.send({
                    type: 'broadcast',
                    event: 'position',
                    payload: {
                        id: newUserId,
                        username,
                        position: serializeVector3(randomPosition)
                    }
                }).catch((error: unknown) => {
                    console.error('Failed to send position update', error)
                })
            } else {
                console.warn('Channel subscription status:', status)
            }
        })

        setChannelState(channel)

        return { channel: channel }
    }, [getRandomCellPosition, channelState, usersState])

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

        // update presence with new position
        /*void channelState.track({
            username: currentUser.username,
            position: serializedPosition
        }).catch((error: unknown) => {
            console.error('Failed to update presence', error)
        })*/

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
        setPositionState,
        getRandomCellPosition,
        initializeUser,
        updateUserPosition
    }
}