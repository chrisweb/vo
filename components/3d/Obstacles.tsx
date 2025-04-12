'use client'

//import { Cylinder, Text } from '@react-three/drei'
//import { Vector3 } from 'three'
import { GridCell } from '@/helpers/grid'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'

export interface Obstacle {
    gridCell: GridCell
    model: string
    orientation: number
}

export interface ObstaclesProps {
    obstacles: Obstacle[]
}

// Define dynamic components outside of the render loop
const DeskModel = dynamic(() => import('@/components/3d/furniture/Desk'), { ssr: false })

export const Obstacles: React.FC<ObstaclesProps> = ({ obstacles }) => {
    return (
        <>
            {obstacles.map((obstacle, index) => {
                const uniqueKey = `${obstacle.model}-${obstacle.gridCell.x.toString()}-${obstacle.gridCell.z.toString()}-${index.toString()}`
                switch (obstacle.model) {
                    case 'Desk': {
                        return (
                            <Suspense key={uniqueKey} fallback={null}>
                                <DeskModel
                                    position={[obstacle.gridCell.x, 0, obstacle.gridCell.z]}
                                    rotation={[0, obstacle.orientation * Math.PI / 2, 0]}
                                    scale={1}
                                />
                            </Suspense>
                        )
                    }
                    default:
                        console.warn(`Unknown model: ${obstacle.model.toString()}`)
                        return null
                }
            })}
        </>
    )
}