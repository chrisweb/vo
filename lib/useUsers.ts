'use client'

import { useCallback, useState } from 'react'
import { Vector3 } from 'three'
import { supabase } from '@/utils/supabase'
import { REALTIME_LISTEN_TYPES } from '@supabase/supabase-js'

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

export const useUsers = () => {

    const [position, setPosition] = useState<Vector3>(
        new Vector3(0.5, 0.5, 0.5)
    )

    const [users, setUsers] = useState<UserData[]>([])
    const [userId, setUserId] = useState('')

    // using set instead of array (as we don't want to have duplicates anyway)
    // sets are much faster for lookups than arrays
    const [occupiedCells, setOccupiedCells] = useState<Set<string>>(new Set())

    const getRandomCellPosition = useCallback(
        (
            existingUsers: UserData[],
            obstacles: {
                x: number
                z: number
            }[],
            gridWidth: number,
            gridHeight: number
        ): Vector3 => {
            let x = 0
            let z = 0
            let positionFound = false

            // track occupied cells
            const occupied = new Set<string>(occupiedCells)
            existingUsers.forEach((user) => {
                const cellX = Math.floor(user.position.x)
                const cellZ = Math.floor(user.position.z)
                occupied.add(`${cellX.toString()},${cellZ.toString()}`)
            })

            while (!positionFound) {

                // generate random cell coordinates
                x = Math.floor(Math.random() * gridWidth)
                z = Math.floor(Math.random() * gridHeight)

                // check if cell is occupied or has an obstacle
                const cellKey = `${x.toString()},${z.toString()}`
                const isObstacle = obstacles.some(obs =>
                    obs.x === x && obs.z === z
                )

                if (!occupied.has(cellKey) && !isObstacle) {
                    positionFound = true
                }
            }

            // return the center of the cell (x+0.5, 0.5, z+0.5)
            return new Vector3(x + 0.5, 0.5, z + 0.5)
        },
        [occupiedCells]
    )

    const initializeUser = useCallback((
        username: string,
        obstacles: {
            x: number
            z: number
        }[],
        gridWidth: number,
        gridHeight: number
    ) => {

        const newUserId = Math.random().toString(36).substring(2, 9)
        setUserId(newUserId)

        const randomPosition = getRandomCellPosition([], obstacles, gridWidth, gridHeight)
        setPosition(randomPosition)

        const newUser: UserData = {
            id: newUserId,
            username,
            position: randomPosition,
        }
        setUsers(currentUsers => [...currentUsers, newUser])

        const cellKey = `${Math.floor(randomPosition.x).toString()},${Math.floor(randomPosition.z).toString()}`

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
                const cellKey = `${Math.floor(pos.x).toString()},${Math.floor(pos.z).toString()}`
                newSet.add(cellKey)
                return newSet
            })
        }).subscribe()

        // broadcast initial position
        const initialPosition: PayloadData = {
            type: REALTIME_LISTEN_TYPES.BROADCAST,
            event: 'position',
            payload: newUser,
        }

        channel.send(initialPosition).catch(() => {
            console.error('Failed to send position update')
        })

        // interval to broadcast position updates
        const interval = setInterval(() => {
            const userData = {
                id: newUserId,
                username: username,
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

        return { channel, interval }
    }, [getRandomCellPosition, position])

    // update user position when moving
    const updateUserPosition = useCallback((
        newPosition: Vector3,
        currentX: number,
        currentZ: number,
        obstacles: {
            x: number
            z: number
        }[]
    ) => {
        const newX = Math.floor(newPosition.x)
        const newZ = Math.floor(newPosition.z)

        // update occupied cells
        setOccupiedCells((prev) => {
            const newSet = new Set(prev)
            // remove old cell if it's not an obstacle
            if (
                !obstacles.some(obs =>
                    obs.x === currentX && obs.z === currentZ
                )
            ) {
                newSet.delete(
                    `${currentX.toString()},${currentZ.toString()}`
                )
            }
            // add new cell
            newSet.add(`${newX.toString()},${newZ.toString()}`)
            return newSet
        })

        setPosition(newPosition)
    }, [])

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