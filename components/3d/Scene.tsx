'use client'

import { Suspense, useEffect, useState } from 'react'
import { Canvas, type GLProps } from '@react-three/fiber'
import { AdaptiveDpr, PerspectiveCamera } from '@react-three/drei'
import World from '@/components/3d/World'

interface IProps extends React.PropsWithChildren {
    altText: string
}

const Scene: React.FC<IProps> = (props) => {
    const [username, setUsername] = useState<string>('')
    const [hasJoined, setHasJoined] = useState<boolean>(false)

    // Check localStorage for saved username on component mount
    useEffect(() => {
        const savedUsername = localStorage.getItem('vo-username')
        if (savedUsername) {
            setUsername(savedUsername)
            setHasJoined(true)
        }
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (username.trim()) {
            // Save username to localStorage
            localStorage.setItem('vo-username', username.trim())
            setHasJoined(true)
        }
    }

    const Fallback: React.FC = () => {
        return (
            <>Sorry, this 3D animation can not be displayed on your device
            </>
        )
    }

    const glProps: GLProps = {
        powerPreference: 'high-performance',
        depth: false,
    }

    if (!hasJoined) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        Join Virtual World
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-300 mb-2"
                            >
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                className="w-full px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value)
                                }}
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150"
                        >
                            Join World
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <>
            <Canvas
                dpr={[1, 1.5]}
                shadows="soft"
                fallback={<Fallback />}
                aria-label={props.altText}
                role="img"
                gl={glProps}
                style={{ height: '80vh' }}
            >
                <Suspense fallback={null}>
                    <AdaptiveDpr pixelated />

                    <PerspectiveCamera
                        makeDefault
                        fov={75}
                        near={0.01}
                        far={50}
                        position={[0, 5, 10]}
                    />

                    <color attach="background" args={['#2f0f30']} />

                    <ambientLight color="#ecd7e2" intensity={1.5} />
                    <spotLight
                        position={[10, 10, 10]}
                        angle={0.15}
                        penumbra={1}
                        intensity={1}
                        castShadow={false}
                    />

                    <World username={username} />
                </Suspense>
            </Canvas>
        </>
    )
}

export default Scene
