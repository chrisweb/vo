'use client'

import { Text } from '@react-three/drei'
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
                {username} {isCurrentUser ? '🚀' : ''}
            </Text>
        </group>
    )
}