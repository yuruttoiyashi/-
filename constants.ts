
import { Character, Attribute, Rarity, Item } from './types';

export const MASTER_CHARACTERS: Character[] = [
  // UR (特別枠)
  { id: 'flandre', name: 'フランドール・スカーレット', hp: 80, maxHp: 80, attack: 120, attribute: Attribute.DARK, rarity: Rarity.UR, color: 'bg-red-900', icon: '🦇💎', description: '恐ろしい破壊の力を持つ吸血鬼。' },

  // FLAME (火/陽)
  { id: 'reimu', name: '博麗 霊夢', hp: 140, maxHp: 140, attack: 28, attribute: Attribute.FLAME, rarity: Rarity.SR, color: 'bg-red-500', icon: '☯️⛩️', description: '幻想郷の巫女。バランス重視。' },
  { id: 'remilia', name: 'レミリア', hp: 120, maxHp: 120, attack: 45, attribute: Attribute.FLAME, rarity: Rarity.R, color: 'bg-indigo-700', icon: '🦇🏰', description: '紅い悪魔。高い攻撃力を持つ。' },
  { id: 'mokou', name: '藤原 妹紅', hp: 200, maxHp: 200, attack: 35, attribute: Attribute.FLAME, rarity: Rarity.SR, color: 'bg-rose-600', icon: '🔥🎋', description: '不死鳥の化身。驚異の生命力。' },
  
  // WIND (風/星)
  { id: 'marisa', name: '霧雨 魔理沙', hp: 100, maxHp: 100, attack: 60, attribute: Attribute.WIND, rarity: Rarity.SR, color: 'bg-yellow-500', icon: '🧹🌟', description: '普通の魔法使い。超火力型。' },
  { id: 'sanae', name: '東風谷 早苗', hp: 130, maxHp: 130, attack: 32, attribute: Attribute.WIND, rarity: Rarity.R, color: 'bg-green-400', icon: '🐸🐍', description: '風祝の少女。奇跡を起こす。' },
  { id: 'aya', name: '射命丸 文', hp: 110, maxHp: 110, attack: 40, attribute: Attribute.WIND, rarity: Rarity.N, color: 'bg-slate-300', icon: '👺📸', description: '清く正しい天狗。最速の翼。' },
  
  // SNOW (雪/月)
  { id: 'cirno', name: 'チルノ', hp: 99, maxHp: 99, attack: 19, attribute: Attribute.SNOW, rarity: Rarity.N, color: 'bg-blue-300', icon: '❄️🧊', description: 'あたい最強！足は速いぞ。' },
  { id: 'youmu', name: '魂魄 妖夢', hp: 150, maxHp: 150, attack: 42, attribute: Attribute.SNOW, rarity: Rarity.R, color: 'bg-emerald-200', icon: '⚔️👻', description: '半分幽霊の庭師。斬れぬものなし。' },
  { id: 'sakuya', name: '十六夜 咲夜', hp: 125, maxHp: 125, attack: 38, attribute: Attribute.SNOW, rarity: Rarity.SR, color: 'bg-blue-600', icon: '🕰️🔪', description: '完璧で瀟洒な従者。時間を操る。' },
];

export const MASTER_ITEMS: Item[] = [
  { id: 'ohagi', name: 'おはぎ', effectValue: 40, type: 'HEAL_FIXED', icon: '🍙', description: 'HPを40回復する。甘い。' },
  { id: 'elixir', name: '蓬莱の薬', effectValue: 80, type: 'HEAL_FIXED', icon: '🧪', description: 'HPを80回復する。禁忌の薬。' },
  { id: 'cup', name: '宝杯', effectValue: 0, type: 'HEAL_FULL', icon: '🏆', description: 'HPを最大まで回復する。' },
];

export const ATTRIBUTE_RELATIONS: Record<Attribute, { strong: Attribute; weak: Attribute }> = {
  [Attribute.SNOW]: { strong: Attribute.WIND, weak: Attribute.FLAME },
  [Attribute.WIND]: { strong: Attribute.FLAME, weak: Attribute.SNOW },
  [Attribute.FLAME]: { strong: Attribute.SNOW, weak: Attribute.WIND },
  [Attribute.DARK]: { strong: Attribute.DARK, weak: Attribute.DARK }, // 特殊
};

export const GACHA_COST_CHAR = 100;
export const GACHA_COST_ITEM = 50;
