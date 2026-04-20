import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { COLS, ROWS, PIECES, PieceType, Piece, getRandomPiece, rotateMatrix } from './types.ts';

interface TetrisState {
  grid: (PieceType | null)[][];
  currentPiece: Piece | null;
  nextPieceType: PieceType;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  paused: boolean;
  gameStarted: boolean;
  lastClearedRows: { y: number, color: string }[];
  didLand: boolean;
}

type TetrisAction =
  | { type: 'START' | 'RESET' }
  | { type: 'TICK' }
  | { type: 'MOVE'; dir: number }
  | { type: 'ROTATE' }
  | { type: 'HARD_DROP' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'CLEAR_EVENTS' };

const checkCollision = (piece: Piece, arena: (PieceType | null)[][]) => {
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
};

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

const getInitialState = (): TetrisState => ({
  grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
  currentPiece: null,
  nextPieceType: getRandomPiece(),
  score: 0,
  level: 1,
  lines: 0,
  gameOver: false,
  paused: false,
  gameStarted: false,
  lastClearedRows: [],
  didLand: false,
});

function tetrisReducer(state: TetrisState, action: TetrisAction): TetrisState {
  if (action.type === 'CLEAR_EVENTS') {
    return { ...state, lastClearedRows: [], didLand: false };
  }

  if (action.type === 'START' || action.type === 'RESET') {
    const nextType = getRandomPiece();
    const type = state.nextPieceType;
    const shape = PIECES[type].shape;
    const x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
    
    return {
      ...getInitialState(),
      gameStarted: true,
      currentPiece: { type, position: [x, 0], rotation: 0 },
      nextPieceType: nextType,
    };
  }

  if (!state.gameStarted || state.gameOver || state.paused) {
    if (action.type === 'TOGGLE_PAUSE' && state.gameStarted && !state.gameOver) {
      return { ...state, paused: !state.paused };
    }
    return state;
  }

  switch (action.type) {
    case 'TICK': {
      if (!state.currentPiece) return state;
      const nextPiece = { 
        ...state.currentPiece, 
        position: [state.currentPiece.position[0], state.currentPiece.position[1] + 1] as [number, number] 
      };

      if (checkCollision(nextPiece, state.grid)) {
        const mergedGrid = merge(state.currentPiece, state.grid);
        
        // Clear lines
        let linesCleared = 0;
        const clearedEvents: { y: number, color: string }[] = [];
        const arenaAfterClear = mergedGrid.filter((row, idx) => {
           const isFull = row.every(cell => cell !== null);
           if (isFull) {
             linesCleared++;
             const pType = row.find(c => c !== null);
             clearedEvents.push({
               y: ROWS - idx - 0.5,
               color: pType ? PIECES[pType].color : '#ffffff'
             });
           }
           return !isFull;
        });

        while (arenaAfterClear.length < ROWS) {
          arenaAfterClear.unshift(Array(COLS).fill(null));
        }

        const points = [0, 100, 300, 500, 800][linesCleared] * state.level;
        const nextLines = state.lines + linesCleared;
        const nextLevel = Math.floor(nextLines / 10) + 1;

        // Spawn next
        const type = state.nextPieceType;
        const shape = PIECES[type].shape;
        const x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
        const newPiece: Piece = { type, position: [x, 0], rotation: 0 };

        if (checkCollision(newPiece, arenaAfterClear)) {
          return { ...state, grid: arenaAfterClear, gameOver: true, currentPiece: null, didLand: true, lastClearedRows: clearedEvents };
        }

        return {
          ...state,
          grid: arenaAfterClear,
          score: state.score + points,
          lines: nextLines,
          level: nextLevel,
          currentPiece: newPiece,
          nextPieceType: getRandomPiece(),
          lastClearedRows: clearedEvents,
          didLand: true
        };
      }
      return { ...state, currentPiece: nextPiece, didLand: false, lastClearedRows: [] };
    }

    case 'MOVE': {
      if (!state.currentPiece) return state;
      const nextPiece = { 
        ...state.currentPiece, 
        position: [state.currentPiece.position[0] + action.dir, state.currentPiece.position[1]] as [number, number] 
      };
      if (!checkCollision(nextPiece, state.grid)) {
        return { ...state, currentPiece: nextPiece };
      }
      return state;
    }

    case 'ROTATE': {
      if (!state.currentPiece) return state;
      const rotated = { ...state.currentPiece, rotation: (state.currentPiece.rotation + 1) % 4 };
      const offsets = [0, -1, 1, -2, 2];
      for (const offset of offsets) {
        const kicked = { ...rotated, position: [rotated.position[0] + offset, rotated.position[1]] as [number, number] };
        if (!checkCollision(kicked, state.grid)) {
          return { ...state, currentPiece: kicked };
        }
      }
      return state;
    }

    case 'HARD_DROP': {
      if (!state.currentPiece) return state;
      let p = state.currentPiece;
      while (!checkCollision({ ...p, position: [p.position[0], p.position[1] + 1] }, state.grid)) {
        p = { ...p, position: [p.position[0], p.position[1] + 1] };
      }
      // Re-trigger TICK to finalize the drop
      return tetrisReducer({ ...state, currentPiece: p }, { type: 'TICK' });
    }

    case 'TOGGLE_PAUSE':
      return { ...state, paused: !state.paused };

    default:
      return state;
  }
}

export const useTetris = () => {
  const [state, dispatch] = useReducer(tetrisReducer, null, getInitialState);

  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const move = useCallback((dir: number) => dispatch({ type: 'MOVE', dir }), []);
  const rotate = useCallback(() => dispatch({ type: 'ROTATE' }), []);
  const drop = useCallback(() => dispatch({ type: 'TICK' }), []);
  const hardDrop = useCallback(() => dispatch({ type: 'HARD_DROP' }), []);
  const setPaused = useCallback(() => dispatch({ type: 'TOGGLE_PAUSE' }), []);

  // Process game events (side effects) from state
  useEffect(() => {
    if (state.didLand) {
      window.dispatchEvent(new CustomEvent('tetris-land'));
      if (state.lastClearedRows.length > 0) {
        state.lastClearedRows.forEach(row => {
          window.dispatchEvent(new CustomEvent('tetris-clear', { detail: row }));
        });
      }
      dispatch({ type: 'CLEAR_EVENTS' });
    }
  }, [state.didLand, state.lastClearedRows]);

  useEffect(() => {
    if (!state.gameStarted || state.gameOver || state.paused) return;
    const interval = Math.max(100, 1000 - (state.level - 1) * 100);
    const id = setInterval(() => dispatch({ type: 'TICK' }), interval);
    return () => clearInterval(id);
  }, [state.gameStarted, state.gameOver, state.paused, state.level]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'p') {
        dispatch({ type: 'TOGGLE_PAUSE' });
        return;
      }
      if (!state.gameStarted || state.gameOver || state.paused) return;
      if (key === 'a' || key === 'arrowleft') move(-1);
      if (key === 'd' || key === 'arrowright') move(1);
      if (key === 's' || key === 'arrowdown') drop();
      if (key === 'w' || key === 'arrowup') rotate();
      if (key === 'r' || key === ' ') hardDrop();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state.gameStarted, state.gameOver, state.paused, move, drop, rotate, hardDrop]);

  const ghostPosition = useMemo(() => {
    if (!state.currentPiece) return null;
    let y = state.currentPiece.position[1];
    while (!checkCollision({ ...state.currentPiece, position: [state.currentPiece.position[0], y + 1] }, state.grid)) {
      y++;
    }
    return [state.currentPiece.position[0], y] as [number, number];
  }, [state.currentPiece, state.grid]);

  return {
    ...state,
    ghostPosition,
    start,
    reset,
    move,
    rotate,
    drop,
    hardDrop,
    setPaused
  };
};
