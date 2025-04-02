'use client'

import { useCallback, useEffect, useState } from 'react'
import { Vector3 } from 'three'
import { supabase } from '@/utils/supabase'
import { REALTIME_LISTEN_TYPES, type RealtimeChannel } from '@supabase/supabase-js'
import { GridCell, cellToString, positionToGridCell, gridCellToPosition } from '@/helpers/grid'
import { v4 as uuidv4 } from 'uuid'

export interface UserData {
    id: string
    username: string
    position: Vector3
}

interface PayloadData {
    type: REALTIME_LISTEN_TYPES.BROADCAST | REALTIME_LISTEN_TYPES.POSTGRES_CHANGES | REALTIME_LISTEN_TYPES.PRESENCE
    event: string
    payload: UserData
}

export const useUser = () => {

    const [position, setPosition] = useState<Vector3>(
        new Vector3(0.5, 0.5, 0.5)
    )

    const [users, setUsers] = useState<UserData[]>([])
    const [userId, setUserId] = useState('')
    const [channelState, setChannelState] = useState<RealtimeChannel | null>(null)
    const [lastBroadcastedPosition, setLastBroadcastedPosition] = useState<Vector3 | null>(null)

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
            // if we can't find a cell we throw an error???
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
        setUserId(newUserId)

        const randomPosition = getRandomCellPosition([], obstacles, gridWidth, gridHeight)

        setPosition(randomPosition)
        setLastBroadcastedPosition(randomPosition)

        const newUser: UserData = {
            id: newUserId,
            username,
            position: randomPosition,
        }

        setUsers(currentUsers => [...currentUsers, newUser])

        const cell = positionToGridCell(randomPosition)
        const cellKey = cellToString(cell)

        setOccupiedCells((prev) => {
            const newSet = new Set(prev)
            newSet.add(cellKey)
            return newSet
        })

        const channel = supabase.channel('virtual-world')

        // @ts-ignore Argument of type '"broadcast"' is not assignable to parameter of type '"system"'
        channel.on('broadcast', { event: 'position' }, (payload: PayloadData) => {
            setUsers((prev) => {

                // update user position if they exist, else insert new position
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

            // update occupied cells
            setOccupiedCells((prev) => {
                const newSet = new Set(prev)
                const pos = payload.payload.position
                const cell = positionToGridCell(pos)
                const cellKey = cellToString(cell)
                newSet.add(cellKey)
                return newSet
            })

        }).subscribe()

        setChannelState(channel)

        // broadcast initial position
        const initialPosition: PayloadData = {
            type: REALTIME_LISTEN_TYPES.BROADCAST,
            event: 'position',
            payload: newUser,
        }

        channel.send(initialPosition).catch(() => {
            console.error('Failed to send position update')
        })

        return { channel: channel }
    }, [getRandomCellPosition])

    // update user position when moving
    const updateUserPosition = useCallback((
        newPosition: Vector3,
        currentX: number,
        currentZ: number,
    ) => {
        // Get new grid cell
        const newCell = positionToGridCell(newPosition)

        // Create current cell from the passed coordinates
        const currentCell: GridCell = { x: currentX, z: currentZ }

        // update occupied cells
        setOccupiedCells((prev) => {
            const newSet = new Set(prev)
            newSet.delete(cellToString(currentCell))
            newSet.add(cellToString(newCell))
            return newSet
        })

        setPosition(newPosition)
    }, [])

    // broadcast position updates only when position changes
    useEffect(() => {
        if (!channelState || !userId || !lastBroadcastedPosition) return

        // Check if position has changed since last broadcast
        if (position.x !== lastBroadcastedPosition.x ||
            position.y !== lastBroadcastedPosition.y ||
            position.z !== lastBroadcastedPosition.z) {

            const currentUser = users.find(user => user.id === userId)
            if (!currentUser) return

            const userData = {
                id: userId,
                username: currentUser.username,
                position,
            }

            // create payload and send update
            const positionUpdate: PayloadData = {
                type: REALTIME_LISTEN_TYPES.BROADCAST,
                event: 'position',
                payload: userData,
            }

            channelState.send(positionUpdate).catch(() => {
                console.error('Failed to send position update')
            })

            setLastBroadcastedPosition(position.clone())
        }
    }, [channelState, userId, position, lastBroadcastedPosition, users])

    return {
        position,
        users,
        userId,
        occupiedCells,
        setPosition,
        getRandomCellPosition,
        initializeUser,
        updateUserPosition
    }
}