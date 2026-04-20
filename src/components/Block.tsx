import { useRef, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface BlockProps {
  position: [number, number, number];
  color: string;
  glow?: boolean;
  opacity?: number;
}

// Shared geometry and materials would require a more complex instancing setup,
// but for ~200 blocks, we can at least optimize the property calculations.

export function Block({ position, color, glow = false, opacity = 1 }: BlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Memoize heavy calculations and object creations
  const { coreColor, attenuationColor } = useMemo(() => {
    const c = new THREE.Color(color);
    return {
      coreColor: c.clone().multiplyScalar(1.2).getStyle(),
      attenuationColor: c.clone().lerp(new THREE.Color('#fff'), 0.2)
    };
  }, [color]);

  return (
    <group position={position}>
      {/* Outer Glass Shell - Pure Refraction */}
      <RoundedBox
        ref={meshRef}
        args={[0.98, 0.98, 0.98]}
        radius={0.15}
        smoothness={16}
      >
        <meshPhysicalMaterial
          color="#fff"
          transmission={0.95}
          thickness={2.0}
          roughness={0.01}
          metalness={0.0}
          clearcoat={1}
          clearcoatRoughness={0}
          ior={1.65}
          dispersion={10.0}
          iridescence={0.8}
          iridescenceIOR={1.5}
          envMapIntensity={3.5}
          attenuationColor={attenuationColor}
          attenuationDistance={0.5}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </RoundedBox>

      {/* Internal Luminous Glass Core */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshPhysicalMaterial
          color={color}
          emissive={glow ? color : 'black'}
          emissiveIntensity={glow ? 15 : 2.5}
          metalness={0.5}
          roughness={0.0}
          transmission={0.8}
          thickness={1.0}
          ior={1.8}
          envMapIntensity={3.0}
          clearcoat={1}
        />
      </mesh>
    </group>
  );
}
