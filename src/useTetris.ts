import { useState, useEffect, useCallback, useRef } from 'react';
import { COLS, ROWS, PIECES, PieceType, Piece } from './types.ts';

const getRandomPiece = (): PieceType => {
  const keys = Object.keys(PIECES) as PieceType[];
  return keys[Math.floor(Math.random() * keys.length)];
};

const rotateMatrix = (matrix: number[][], rotation: number): number[][] => {
  let result = matrix;
  const count = rotation % 4;
  for (let i = 0; i < count; i++) {
    result = result[0].map((_, index) => result.map(row => row[index]).reverse());
  }
  return result;
};

export const useTetris = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [grid, setGrid] = useState<(PieceType | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [nextPieceType, setNextPieceType] = useState<PieceType>(getRandomPiece());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const checkCollision = useCallback((piece: Piece, arena: (PieceType | null)[][]) => {
    const shape = rotateMatrix(PIECES[piece.type].shape, piece.rotation);
    const [x, y] = piece.position;
    
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const ny = y + r;
          const nx = x + c;
          if (
            nx < 0 || nx >= COLS ||
            ny >= ROWS ||
            (ny >= 0 && arena[ny][nx] !== null)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const spawnPiece = useCallback((type: PieceType, currentGrid: (PieceType | null)[][]) => {
    const shape = PIECES[type].shape;
    const x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
    const y = 0;
    
    const newPiece: Piece = {
      type,
      position: [x, y],
      rotation: 0
    };

    if (checkCollision(newPiece, currentGrid)) {
      setGameOver(true);
      return null;
    }
    return newPiece;
  }, [checkCollision]);

  const merge = (piece: Piece, arena: (PieceType | null)[][]) => {
    const newArena = arena.map(row => [...row]);
    const shape = rotateMatrix(PIECES[piece.type].shape, piece.rotation);
    const [x, y] = piece.position;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const ny = y + r;
          const nx = x + c;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            newArena[ny][nx] = piece.type;
          }
        }
      }
    }
    return newArena;
  };

  const clearLines = (arena: (PieceType | null)[][], currentLevel: number) => {
    let linesCleared = 0;
    const newArena = arena.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) linesCleared++;
      return !isFull;
    });

    if (linesCleared > 0) {
      // Find row index for particle effect
      const clearedIdx = arena.findIndex(row => row.every(cell => cell !== null));
      const pColor = clearedIdx !== -1 ? arena[clearedIdx].find(c => c !== null) : null;
      
      window.dispatchEvent(new CustomEvent('tetris-clear', { 
        detail: { 
          color: pColor ? PIECES[pColor].color : '#ffffff',
          y: ROWS - clearedIdx - 0.5
        } 
      }));

      while (newArena.length < ROWS) {
        newArena.unshift(Array(COLS).fill(null));
      }

      const points = [0, 100, 300, 500, 800][linesCleared] * currentLevel;
      setScore(s => s + points);
      setLines(l => {
        const nextLines = l + linesCleared;
        if (Math.floor(nextLines / 10) > Math.floor(l / 10)) {
          setLevel(lvl => lvl + 1);
        }
        return nextLines;
      });
    }
    return newArena;
  };

  const drop = useCallback(() => {
    if (!currentPiece || gameOver || paused || !gameStarted) return;

    const nextPiece = { ...currentPiece, position: [currentPiece.position[0], currentPiece.position[1] + 1] as [number, number] };

    if (checkCollision(nextPiece, grid)) {
      const mergedGrid = merge(currentPiece, grid);
      const cleanedGrid = clearLines(mergedGrid, level);
      setGrid(cleanedGrid);
      
      const nextType = nextPieceType;
      const nextNextType = getRandomPiece();
      setNextPieceType(nextNextType);
      
      const spawned = spawnPiece(nextType, cleanedGrid);
      setCurrentPiece(spawned);
      window.dispatchEvent(new CustomEvent('tetris-land'));
    } else {
      setCurrentPiece(nextPiece);
    }
  }, [currentPiece, grid, gameOver, paused, gameStarted, level, nextPieceType, spawnPiece, checkCollision]);

  const move = useCallback((dir: number) => {
    if (!currentPiece || gameOver || paused || !gameStarted) return;
    const nextPiece = { ...currentPiece, position: [currentPiece.position[0] + dir, currentPiece.position[1]] as [number, number] };
    if (!checkCollision(nextPiece, grid)) {
      setCurrentPiece(nextPiece);
    }
  }, [currentPiece, gameOver, paused, gameStarted, grid, checkCollision]);

  const rotate = useCallback(() => {
    if (!currentPiece || gameOver || paused || !gameStarted) return;
    const rotated = { ...currentPiece, rotation: (currentPiece.rotation + 1) % 4 };
    
    // Basic wall kick
    const offsets = [0, -1, 1];
    for (const offset of offsets) {
      const kicked = { ...rotated, position: [rotated.position[0] + offset, rotated.position[1]] as [number, number] };
      if (!checkCollision(kicked, grid)) {
        setCurrentPiece(kicked);
        return;
      }
    }
  }, [currentPiece, gameOver, paused, gameStarted, grid, checkCollision]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || paused || !gameStarted) return;
    let p = currentPiece;
    while (!checkCollision({ ...p, position: [p.position[0], p.position[1] + 1] }, grid)) {
      p = { ...p, position: [p.position[0], p.position[1] + 1] };
    }
    
    const merged = merge(p, grid);
    const cleaned = clearLines(merged, level);
    setGrid(cleaned);
    
    const nextType = nextPieceType;
    setNextPieceType(getRandomPiece());
    setCurrentPiece(spawnPiece(nextType, cleaned));
    window.dispatchEvent(new CustomEvent('tetris-land'));
  }, [currentPiece, grid, gameOver, paused, gameStarted, level, nextPieceType, spawnPiece, checkCollision]);

  const start = useCallback(() => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setPaused(false);
    setGameStarted(true);
    
    const initialType = getRandomPiece();
    const nextType = getRandomPiece();
    setNextPieceType(nextType);
    setCurrentPiece({
        type: initialType,
        position: [Math.floor(COLS/2) - 1, 0],
        rotation: 0
    });
  }, []);

  const reset = useCallback(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (!gameStarted || gameOver || paused) return;
    const interval = Math.max(100, 1000 - (level - 1) * 100);
    const id = setInterval(drop, interval);
    return () => clearInterval(id);
  }, [gameStarted, gameOver, paused, level, drop]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') move(-1);
      if (key === 'd' || key === 'arrowright') move(1);
      if (key === 's' || key === 'arrowdown') drop();
      if (key === 'w' || key === 'arrowup') rotate();
      if (key === 'r' || key === ' ') hardDrop();
      if (key === 'p') setPaused(p => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameStarted, gameOver, move, drop, rotate, hardDrop]);

  return {
    grid,
    currentPiece,
    nextPieceType,
    score,
    level,
    lines,
    gameOver,
    paused,
    gameStarted,
    start,
    reset,
    move,
    rotate,
    drop,
    hardDrop,
    setPaused
  };
};
