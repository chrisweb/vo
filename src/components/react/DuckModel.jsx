import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";

function Model() {
  const gltf = useGLTF("/models/scene.gltf");
  const modelRef = useRef();

  // Slowly rotate the model
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.005;
    }
  });

  return (
    <primitive
      ref={modelRef}
      object={gltf.scene}
      scale={2}
      position={[0, -2, 0]}
    />
  );
}

export default function DuckModel() {
  const [mounted, setMounted] = useState(false);

  // This ensures the component only renders on the client side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div style={{ width: "100%", height: "500px", background: "#f0f0f0" }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Model />
        <OrbitControls />
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 10]}
          fov={50}
        />
      </Canvas>
    </div>
  );
}
