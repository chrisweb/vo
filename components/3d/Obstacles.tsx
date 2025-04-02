'use client'

import { Cylinder, Text } from '@react-three/drei'
import { Vector3 } from 'three'

interface ObstaclesProps {
    obstacles: { x: number, z: number }[]
}

export const Obstacles: React.FC<ObstaclesProps> = ({ obstacles }) => {
    return (
        <>
            {obstacles.map((obstacle, index) => (
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
        </>
    )
}