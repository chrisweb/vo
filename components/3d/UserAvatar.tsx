'use client'

import { Cylinder, Text } from '@react-three/drei'
import { Vector3 } from 'three'

interface UserAvatarProps {
    x: number
    y: number
    z: number
    username: string
    color: string
    isCurrentUser: boolean
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
    x,
    y,
    z,
    username,
    color,
    isCurrentUser
}) => {
    const position = new Vector3(x, y, z)
    return (
        <group position={position}>
            <Cylinder
                args={[0.2, 0.2, 1.2, 16]}
                position={[0, 0, 0]}
                castShadow
            >
                <meshStandardMaterial color={color} />
            </Cylinder>
            <Text
                position={new Vector3(0, 1.1, 0)}
                fontSize={0.4}
                color="#ff00aa"
                anchorX="center"
                anchorY="middle"
            >
                {username} {isCurrentUser ? '🚀' : ''}
            </Text>
        </group>
    )
}