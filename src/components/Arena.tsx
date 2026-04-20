import { MeshReflectorMaterial, ContactShadows } from '@react-three/drei';
import { COLS, ROWS } from '../types.ts';

export function Arena() {
  return (
    <group>
      {/* Photorealistic Reflective Floor (RTX Simulation) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COLS / 2 - 0.5, -0.01, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[0, 0]}
          resolution={2048}
          mixBlur={0}
          mixStrength={100}
          roughness={0}
          depthScale={1.4}
          minDepthThreshold={0.5}
          maxDepthThreshold={1.5}
          color="#000000"
          metalness={1}
          mirror={1}
          distortion={0}
        />
      </mesh>

      {/* Grid Guide - Highly subtle for "Real Life" feel */}
      <gridHelper 
        args={[100, 50, '#111', '#050505']} 
        position={[COLS / 2 - 0.5, 0.005, 0]} 
      />

      {/* Play Area Frame (Background) */}
      <group position={[COLS / 2 - 0.5, ROWS / 2, -0.6]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[COLS + 0.5, ROWS + 0.5, 0.1]} />
          <meshPhysicalMaterial 
            color="#050505" 
            metalness={1} 
            roughness={0.2}
            reflectivity={0.5}
          />
        </mesh>
        
        {/* Subtle Frame Borders */}
        <mesh position={[-(COLS/2 + 0.1), 0, 0.1]}>
          <boxGeometry args={[0.2, ROWS + 0.6, 0.2]} />
          <meshPhysicalMaterial color="#111" metalness={1} roughness={0.1} />
        </mesh>
        <mesh position={[(COLS/2 + 0.1), 0, 0.1]}>
          <boxGeometry args={[0.2, ROWS + 0.6, 0.2]} />
          <meshPhysicalMaterial color="#111" metalness={1} roughness={0.1} />
        </mesh>
        <mesh position={[0, -(ROWS/2 + 0.1), 0.1]} rotation={[0, 0, Math.PI/2]}>
          <boxGeometry args={[0.2, COLS + 0.6, 0.2]} />
          <meshPhysicalMaterial color="#111" metalness={1} roughness={0.1} />
        </mesh>
      </group>

      <ContactShadows 
         position={[COLS / 2 - 0.5, 0.01, 0]} 
         opacity={0.8} 
         scale={20} 
         blur={1.5} 
         far={5} 
         color="#000000" 
      />
    </group>
  );
}
