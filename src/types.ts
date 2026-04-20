export type Point = [number, number, number];

export type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export interface Piece {
  type: PieceType;
  position: [number, number]; // [x, y] in grid coordinates
  rotation: number; // 0, 1, 2, 3
}

export const COLS = 10;
export const ROWS = 20;

export const PIECES: Record<PieceType, { shape: number[][]; color: string }> = {
  I: { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: '#00ccff' }, // Vibrant Cyan
  J: { shape: [[1,0,0], [1,1,1], [0,0,0]], color: '#2b58ff' }, // Bold Blue
  L: { shape: [[0,0,1], [1,1,1], [0,0,0]], color: '#ff6b35' }, // Intense Orange
  O: { shape: [[1,1], [1,1]], color: '#ffca3a' }, // Deep Yellow
  S: { shape: [[0,1,1], [1,1,0], [0,0,0]], color: '#54e346' }, // Neon Green
  T: { shape: [[0,1,0], [1,1,1], [0,0,0]], color: '#9b5de5' }, // Rich Purple
  Z: { shape: [[1,1,0], [0,1,1], [0,0,0]], color: '#ef233c' }, // Sharp Red
};

export const getRandomPiece = (): PieceType => {
  const keys = Object.keys(PIECES) as PieceType[];
  return keys[Math.floor(Math.random() * keys.length)];
};

export const rotateMatrix = (matrix: number[][], rotation: number): number[][] => {
  let result = matrix;
  const count = rotation % 4;
  for (let i = 0; i < count; i++) {
    result = result[0].map((_, index) => result.map(row => row[index]).reverse());
  }
  return result;
};
