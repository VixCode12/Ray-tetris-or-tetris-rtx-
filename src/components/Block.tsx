import { useRef } from 'react';
import { RoundedBox, Edges } from '@react-three/drei';
import * as THREE from 'three';

interface BlockProps {
  position: [number, number, number];
  color: string;
  glow?: boolean;
  opacity?: number;
}

export function Block({ position, color, glow = false, opacity = 1 }: BlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Derive a slightly different color for the deep core
  const coreColor = new THREE.Color(color).multiplyScalar(0.7).getStyle();
  const accentColor = new THREE.Color(color).addScalar(0.2).getStyle();

  return (
    <group position={position}>
      {/* Outer Prism Shell - Simulating Ray-Traced Refraction and Dispersion */}
      <RoundedBox
        ref={meshRef}
        args={[0.95, 0.95, 0.95]}
        radius={0.15} // Slightly sharper but still smooth for better highlight definition
        smoothness={16} // Higher smoothness for better geometric detail
      >
        <meshPhysicalMaterial
          color={color}
          transmission={0.85} // Even more transparent for crystal clarity
          thickness={1.8} 
          roughness={0.02} // Tiny bit of roughness for better highlight spread
          metalness={0.05} // Lower metalness to let the internal color shine through more
          clearcoat={1}
          clearcoatRoughness={0.05}
          ior={1.8} // Diamond-like refraction
          dispersion={10.0} // Even more dispersion
          iridescence={0.6}
          iridescenceIOR={1.6}
          envMapIntensity={2.5} // Balanced reflections
          attenuationColor={new THREE.Color(color)}
          attenuationDistance={0.5}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </RoundedBox>

      {/* Internal "Circuit/Core Hub" - Multi-layered for "Detail" */}
      <group>
        {/* The Core Gem */}
        <RoundedBox
          args={[0.4, 0.4, 0.4]}
          radius={0.08}
          smoothness={8}
        >
          <meshPhysicalMaterial
            color={color} // Use full color instead of coreColor for more pop
            emissive={glow ? color : 'black'}
            emissiveIntensity={glow ? 12 : 2} // Reduced intensity for a more subtle look
            metalness={1}
            roughness={0}
            reflectivity={1}
            clearcoat={1}
            envMapIntensity={3}
          />
        </RoundedBox>

        {/* Floating Halo Ring for extra detail */}
        {glow && (
          <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
            <torusGeometry args={[0.35, 0.02, 16, 32]} />
            <meshStandardMaterial 
              color={accentColor} 
              emissive={accentColor} 
              emissiveIntensity={4} // Subdued halo
              transparent 
              opacity={0.4} 
            />
          </mesh>
        )}
      </group>

      {/* Tech Frame Edges - Adding geometric complexity */}
      <Edges
        threshold={15}
        color={accentColor}
        opacity={0.3}
        transparent
      />
    </group>
  );
}
