import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, Stars, Float, Text } from '@react-three/drei';
import { useTetris } from './useTetris.ts';
import { Block } from './components/Block.tsx';
import { Arena } from './components/Arena.tsx';
import { PIECES, COLS, ROWS, PieceType } from './types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, Pause, RefreshCw, Cpu, Layers, Zap, ArrowLeft, ArrowRight, ArrowDown, RotateCcw, ChevronDown } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

const Tetromino = ({ type, position, rotation, isGhost = false }: { 
    type: PieceType; 
    position: [number, number]; 
    rotation: number;
    isGhost?: boolean;
}) => {
  const [px, py] = position;
  const shape = useMemo(() => {
    let result = PIECES[type].shape;
    const count = rotation % 4;
    for (let i = 0; i < count; i++) {
        result = result[0].map((_, index) => result.map(row => row[index]).reverse());
    }
    return result;
  }, [type, rotation]);

  return (
    <group>
      {shape.map((row, r) =>
        row.map((cell, c) => (
          cell ? <Block 
            key={`${r}-${c}`} 
            position={[px + c, ROWS - (py + r) - 0.5, 0]} 
            color={PIECES[type].color} 
            glow={!isGhost}
            opacity={isGhost ? 0.2 : 1}
          /> : null
        ))
      )}
    </group>
  );
};

const CameraRig = () => {
  const [shake, setShake] = useState(0);
  
  useEffect(() => {
    const handleLand = () => setShake(0.3);
    window.addEventListener('tetris-land', handleLand);
    return () => window.removeEventListener('tetris-land', handleLand);
  }, []);

  useFrame((state, delta) => {
    if (shake > 0) {
      state.camera.position.x += (Math.random() - 0.5) * shake;
      state.camera.position.y += (Math.random() - 0.5) * shake;
      setShake(s => Math.max(0, s - delta * 2));
    }
  });

  return null;
};

const ParticleBurst = () => {
    const [bursts, setBursts] = useState<{ id: number, position: [number, number, number], color: string }[]>([]);
    const nextId = useRef(0);

    useEffect(() => {
        const handleClear = (e: any) => {
            const id = nextId.current++;
            const yPos = e.detail.y;
            setBursts(prev => [...prev, { id, position: [COLS / 2, yPos, 0], color: e.detail.color || '#ffffff' }]);
            setTimeout(() => {
                setBursts(prev => prev.filter(b => b.id !== id));
            }, 2000);
        };

        window.addEventListener('tetris-clear', handleClear);
        return () => window.removeEventListener('tetris-clear', handleClear);
    }, []);

    return (
        <>
            {bursts.map(b => (
                <group key={b.id} position={b.position}>
                    {Array.from({ length: 30 }).map((_, i) => {
                        const angle = Math.random() * Math.PI * 2;
                        const velocity = Math.random() * 10 + 2;
                        return (
                            <ParticleItem 
                                key={i} 
                                color={b.color} 
                                velocity={[Math.cos(angle) * velocity, Math.random() * 12, Math.sin(angle) * velocity / 3]} 
                            />
                        );
                    })}
                </group>
            ))}
        </>
    );
};

const ParticleItem = ({ color, velocity }: { color: string, velocity: [number, number, number] }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [vel] = useState(velocity);
    const [opacity, setOpacity] = useState(1);

    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.position.x += vel[0] * delta;
            meshRef.current.position.y += vel[1] * delta;
            meshRef.current.position.z += vel[2] * delta;
            vel[1] -= 25 * delta; 
            setOpacity(o => Math.max(0, o - delta * 0.7));
            meshRef.current.scale.multiplyScalar(0.97);
        }
    });

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={5} transparent opacity={opacity} />
        </mesh>
    );
};

export default function App() {
  const { 
    grid, currentPiece, nextPieceType, score, level, lines, gameOver, paused, 
    reset, gameStarted, start, move, rotate, drop, hardDrop, setPaused 
  } = useTetris();

  const ghostPosition = useMemo(() => {
    if (!currentPiece) return null;
    let y = currentPiece.position[1];
    
    const checkCollision = (py: number) => {
        let shape = PIECES[currentPiece.type].shape;
        const count = currentPiece.rotation % 4;
        for (let i = 0; i < count; i++) {
            shape = shape[0].map((_, idx) => shape.map(row => row[idx]).reverse());
        }
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] !== 0) {
                    const ny = py + r;
                    const nx = currentPiece.position[0] + c;
                    if (ny >= ROWS || (ny >= 0 && grid[ny][nx] !== null)) return true;
                }
            }
        }
        return false;
    };

    while (!checkCollision(y + 1)) y++;
    return [currentPiece.position[0], y] as [number, number];
  }, [currentPiece, grid]);

  useEffect(() => {
      if (gameOver) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
  }, [gameOver]);

  const TouchButton = ({ onClick, children, className = "" }: { onClick: () => void, children: React.ReactNode, className?: string }) => (
    <motion.button
        whileTap={{ scale: 0.9, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
        onClick={onClick}
        className={`w-14 h-14 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md text-white pointer-events-auto ${className}`}
    >
        {children}
    </motion.button>
  );

  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <CameraRig />
        <PerspectiveCamera makeDefault position={[COLS / 2, 11, 28]} fov={45} />
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.1}
          target={[COLS / 2 - 0.5, ROWS / 2 - 2, 0]}
        />
        
        <ambientLight intensity={0.1} />
        
        {/* Main "RTX" Directional Source */}
        <directionalLight 
          position={[15, 25, 10]} 
          intensity={4} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={60}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />

        {/* Right Corner Accent Light */}
        <spotLight 
          position={[25, 15, 5]} 
          angle={0.6} 
          penumbra={1} 
          intensity={8} 
          color="#ffaa44" // Warm amber light from the right
          castShadow 
        />

        <spotLight position={[COLS / 2, ROWS + 10, 15]} angle={0.4} penumbra={1} intensity={3} castShadow />
        
        {/* Physical Rim Lights */}
        <pointLight position={[-15, 10, 5]} intensity={2} color="#44aaff" /> // Subtle blue fill from left
        <pointLight position={[COLS + 15, 10, 5]} intensity={2} color="#ffffff" />

        <Environment preset="night" />

        <Arena />
        <ParticleBurst />
        
        {/* Active Piece */}
        {!gameOver && currentPiece && <Tetromino type={currentPiece.type} position={currentPiece.position} rotation={currentPiece.rotation} />}

        {/* Ghost Piece */}
        {!gameOver && ghostPosition && currentPiece && <Tetromino type={currentPiece.type} position={ghostPosition} rotation={currentPiece.rotation} isGhost />}

        {/* Grid Blocks */}
        <group>
            {grid.map((row, r) => row.map((type, c) => type ? <Block key={`${r}-${c}`} position={[c, ROWS - r - 0.5, 0]} color={PIECES[type].color} glow /> : null))}
        </group>

        <Stars radius={150} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        
        <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
            <Text position={[COLS / 2, ROWS + 4, -5]} fontSize={2.5} color="white">ULTRA TETRIS</Text>
        </Float>

        <EffectComposer enableNormalPass={false} multisampling={8}>
          <Bloom luminanceThreshold={1} mipmapBlur intensity={0.3} radius={0.5} />
          <Vignette offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-10 flex justify-between pointer-events-none items-start z-10">
        <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-6">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2 text-cyan-400 text-[10px] uppercase tracking-widest font-mono font-bold">
                    <Layers size={14} /> Level
                </div>
                <div className="text-4xl font-black">{level}</div>
            </div>
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2 text-gray-500 text-[10px] uppercase tracking-widest font-mono font-bold">
                    <Zap size={14} /> Lines
                </div>
                <div className="text-2xl font-mono">{lines.toString().padStart(4, '0')}</div>
            </div>
        </motion.div>

        <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col gap-6 items-end">
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 min-w-[240px] text-right">
                <div className="flex items-center justify-end gap-2 mb-2 text-orange-400 text-[10px] uppercase tracking-widest font-mono font-bold">
                    Score <Trophy size={14} />
                </div>
                <div className="text-4xl font-black">{score.toLocaleString()}</div>
            </div>
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                <div className="text-gray-500 text-[10px] uppercase tracking-widest font-mono mb-4 font-bold">Next Piece</div>
                <div className="text-4xl font-black drop-shadow-lg" style={{ color: PIECES[nextPieceType].color }}>{nextPieceType}</div>
            </div>
            <TouchButton onClick={reset} className="pointer-events-auto shadow-2xl"><RefreshCw size={24} /></TouchButton>
        </motion.div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-30 text-[10px] font-mono tracking-[0.5em] text-white">BY VIXCODE</div>

      {/* Overlays */}
      <AnimatePresence>
        {!gameStarted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black z-[100] p-10">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
                    <h1 className="text-8xl font-black italic mb-2 tracking-tighter">ULTRA TETRIS</h1>
                    <p className="text-cyan-400 font-mono text-sm tracking-[0.6em] mb-12 uppercase">System Matrix Active</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={start} className="px-12 py-6 bg-white text-black text-xl font-black rounded-2xl shadow-2xl">INITIALIZE LINK</motion.button>
                </motion.div>
            </motion.div>
        )}
        {(gameOver || paused) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-xl z-[90] p-10">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-black border border-white/10 p-12 rounded-[2rem] text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
                    <h2 className={`text-5xl font-black mb-4 uppercase ${gameOver ? 'text-red-500' : 'text-white'}`}>{gameOver ? 'Core Breach' : 'Paused'}</h2>
                    <p className="text-gray-500 font-mono text-[10px] tracking-widest mb-10 uppercase">Final Yield: {score}</p>
                    <button onClick={reset} className="w-full py-5 bg-white text-black font-black rounded-xl hover:bg-gray-100 transition-colors">RE-INITIALIZE</button>
                    {gameOver && (
                        <div className="mt-8 pt-8 border-t border-white/5 opacity-50">
                             <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Logic Integrity: 0%</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {gameStarted && !gameOver && !paused && (
        <div className="absolute bottom-10 right-10 flex flex-col items-center gap-3 z-50">
            <div className="flex gap-3"><TouchButton onClick={rotate}><RotateCcw size={20} /></TouchButton></div>
            <div className="flex gap-3">
                <TouchButton onClick={() => move(-1)}><ArrowLeft size={20} /></TouchButton>
                <TouchButton onClick={drop}><ArrowDown size={20} /></TouchButton>
                <TouchButton onClick={() => move(1)}><ArrowRight size={20} /></TouchButton>
            </div>
            <TouchButton onClick={hardDrop} className="w-full px-8 flex gap-2 text-[10px] font-mono tracking-widest h-10 mt-1 uppercase"><ChevronDown size={14} /> Quantum Drop</TouchButton>
        </div>
      )}

      {/* Shortcuts Center */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-20 pointer-events-none">
          <div className="flex gap-4"><span className="px-2 py-1 border border-white/20 rounded text-[9px] font-mono uppercase">WASD</span><span className="px-2 py-1 border border-white/20 rounded text-[9px] font-mono uppercase">Space / R</span></div>
          <span className="text-[8px] font-mono tracking-[0.5em] uppercase">Control Matrix</span>
      </div>
    </div>
  );
}
