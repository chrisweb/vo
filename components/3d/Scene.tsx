'use client'

import { Suspense } from 'react'
import { Canvas, type GLProps } from '@react-three/fiber'
import {
    AdaptiveDpr,
    OrbitControls, /*, SoftShadows, Loader, PerformanceMonitor, PerformanceMonitorApi, Hud, useDetectGPU, useProgress, StatsGl*/
    PerspectiveCamera,
} from '@react-three/drei'

interface IProps extends React.PropsWithChildren {
    altText: string
}

const Scene: React.FC<IProps> = (props) => {
    // uncomment if you want to see what useDetectGPU returns
    //const gpuInfo = useDetectGPU()
    //if (process.env.NODE_ENV === 'development') {
    //console.log('useDetectGPU: ', gpuInfo)
    //}

    /*const onCanvasCreatedHandler = (state: RootState) => {
        //if (process.env.NODE_ENV === 'development') {
        //console.log(state)
        //}
    }*/

    /*const onPerformanceChangeHandler = (api: PerformanceMonitorApi) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(api.averages)
            console.log(api.fps)
            console.log(api.refreshrate)
            console.log(api.frames)
        }
    }*/

    /*function Loader() {
        //const { active, progress, errors, item, loaded, total } = useProgress()
        //if (process.env.NODE_ENV === 'development') {
        //console.log(active, progress, errors, item, loaded, total)
        //}
    }*/

    const Fallback: React.FC = () => {
        return <>Sorry, this 3D animation can not be displayed on your device</>
    }

    const glProps: GLProps = {
        powerPreference: 'high-performance',
        depth: false,
        //unpackColorSpace: 'srgb',
        //drawingBufferColorSpace: 'display-p3',
        //unpackColorSpace: 'display-p3',
    }

    return (
        <>
            <Canvas
                // https://docs.pmnd.rs/react-three-fiber/tutorials/v8-migration-guide#new-pixel-ratio-default
                // pixel ratio, should between 1 or 2, a small pixel ratio will improve performance
                // but will also reduce the quality of the image
                dpr={[1, 1.5]} // Limit pixel ratio to improve performance
                // https://docs.pmnd.rs/react-three-fiber/api/canvas#render-defaults
                shadows='soft'
                fallback={<Fallback />}
                aria-label={props.altText}
                role='img'
                gl={glProps}
                //onCreated={onCanvasCreatedHandler}
            >
                <Suspense fallback={null}>
                    <AdaptiveDpr pixelated />

                    <PerspectiveCamera
                        makeDefault
                        fov={75}
                        near={0.01}
                        far={3}
                        position={[0, 0.06, 1]}
                    />

                    <color attach='background' args={['#2f0f30']} />

                    {/* the following components can be useful in development */}
                    {/*<axesHelper />*/}
                    {/*<gridHelper />*/}
                    {/*<Stats />*/}
                    {/*<StatsGl />*/}
                    {/*<PerformanceMonitor onChange={onPerformanceChangeHandler} />*/}
                    {/* GUI: look at https://github.com/pmndrs/leva */}

                    <ambientLight color='#ecd7e2' intensity={1.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

                    {/*<SoftShadows size={10} samples={17} color="#2f0f30" near={9} far={20} />*/}
                    {/*<ContactShadows position={[0, -1.5, 0]} opacity={0.75} scale={10} blur={2.5} far={4} />*/}
                    {/*<Environment preset="city" />*/}

                    <OrbitControls enablePan enableZoom enableRotate minDistance={2} maxDistance={10} />
                </Suspense>
            </Canvas>
            {/*<Loader />*/}
        </>
    )
}

export default Scene