import { useRef } from "preact/hooks";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import render from 'preact';

// Create a Box component that will be rendered inside the Canvas
function Box(props) {
  const meshRef = useRef();
  
  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += 0.01;
    meshRef.current.rotation.y += 0.01 * props.rotationDirection;
  });
  
  return (
    <mesh {...props} ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={props.color || 0xff9900} />
    </mesh>
  );
}

export default function ThreeScene() {
  return (
    <div style={{ width: "100%", height: "400px", backgroundColor: "#000" }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        
        <Box position={[-1.5, 0, 0]} rotationDirection={1} />
        <Box position={[1.5, 0, 0]} rotationDirection={-1} />
        
        {/* OrbitControls from @react-three/drei */}
        <OrbitControls enableDamping />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}