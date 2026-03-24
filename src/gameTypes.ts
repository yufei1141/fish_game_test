export type FishType = {
  name: string;
  emoji: string;
  value: number;
  baseSpeed: number;
  catchRate: number; // 0.0 to 1.0
  size: number;
};

export const FISH_TYPES: FishType[] = [
  { name: 'Small Fish', emoji: '🐟', value: 15, baseSpeed: 1.5, catchRate: 0.8, size: 30 },
  { name: 'Tropical', emoji: '🐠', value: 30, baseSpeed: 2.0, catchRate: 0.6, size: 35 },
  { name: 'Puffer', emoji: '🐡', value: 50, baseSpeed: 1.0, catchRate: 0.4, size: 40 },
  { name: 'Squid', emoji: '🦑', value: 80, baseSpeed: 1.8, catchRate: 0.3, size: 45 },
  { name: 'Octopus', emoji: '🐙', value: 120, baseSpeed: 1.2, catchRate: 0.25, size: 50 },
  { name: 'Turtle', emoji: '🐢', value: 200, baseSpeed: 0.8, catchRate: 0.15, size: 60 },
  { name: 'Shark', emoji: '🦈', value: 500, baseSpeed: 2.5, catchRate: 0.05, size: 80 },
];

export interface Fish {
  id: number;
  type: FishType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  caught: boolean;
  catchTimer: number;
  direction: 1 | -1; // 1 for right, -1 for left
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  level: number;
  state: 'moving' | 'net';
  netRadius: number;
  netTimer: number;
  maxNetTimer: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  color: string;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  timer: number;
}
