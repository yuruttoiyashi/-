
export enum Attribute {
  SNOW = 'SNOW',
  FLAME = 'FLAME',
  WIND = 'WIND',
  DARK = 'DARK' // フラン専用：破壊
}

export enum Rarity {
  N = 'N',
  R = 'R',
  SR = 'SR',
  UR = 'UR' // フラン専用：ウルトラレア
}

export type ActionType = 'ATTACK' | 'HEAL' | 'GUARD' | 'ITEM' | 'RUN';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
export type TurnOwner = 'PLAYER' | 'CPU' | 'TRANSITION';

export interface Character {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  attribute: Attribute;
  rarity: Rarity;
  color: string;
  icon: string;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  effectValue: number;
  type: 'HEAL_FIXED' | 'HEAL_FULL';
  icon: string;
  description: string;
}

export type GamePhase = 'SELECTION' | 'BATTLE' | 'RESULT' | 'GACHA';

export interface BattleState {
  playerTeam: Character[];
  cpuTeam: Character[];
  currentPlayerIdx: number;
  currentCpuIdx: number;
  playerCurrentHps: number[];
  cpuCurrentHps: number[];
  isGuarding: boolean;
  difficulty: Difficulty;
  turn: TurnOwner;
}
