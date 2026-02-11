
import React from 'react';
import { Character, Rarity, Attribute } from '../types';

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  order?: number;
  onClick?: () => void;
  disabled?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ 
  character, 
  isSelected, 
  order, 
  onClick,
  disabled 
}) => {
  const isUR = character.rarity === Rarity.UR;
  const isFlandre = character.id === 'flandre';

  const rarityColor = isUR 
    ? 'bg-gradient-to-r from-red-600 via-purple-600 to-black text-white'
    : character.rarity === Rarity.SR ? 'bg-yellow-400 text-slate-900' 
    : character.rarity === Rarity.R ? 'bg-cyan-400 text-slate-900' 
    : 'bg-white/20 text-white';

  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`
        relative w-full aspect-[3/4] rounded-[2rem] p-4 cursor-pointer transition-all duration-300
        ${isSelected 
          ? 'ring-[6px] ring-pink-400 scale-105 shadow-[0_0_30px_rgba(244,114,182,0.4)]' 
          : 'ring-2 ring-white/20 hover:ring-white/50 shadow-lg'}
        ${character.color}
        ${disabled ? 'opacity-40 grayscale-[0.8] cursor-not-allowed' : ''}
        ${isUR ? 'animate-pulse' : ''}
      `}
    >
      {/* フランの七色の翼（宝石）の装飾 */}
      {isFlandre && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute top-1/4 -left-2 flex flex-col gap-1 opacity-80">
            <span className="text-[10px]">🔴</span><span className="text-[10px]">🟠</span><span className="text-[10px]">🟡</span><span className="text-[10px]">🟢</span>
          </div>
          <div className="absolute top-1/4 -right-2 flex flex-col gap-1 opacity-80">
            <span className="text-[10px]">🔵</span><span className="text-[10px]">🟣</span><span className="text-[10px]">💖</span><span className="text-[10px]">💎</span>
          </div>
        </div>
      )}

      {isSelected && order !== undefined && (
        <div className="absolute -top-3 -right-3 w-10 h-10 bg-pink-400 text-white rounded-full flex items-center justify-center font-black z-20 shadow-md text-lg">
          {order + 1}
        </div>
      )}

      {/* Rarity Badge */}
      <div className={`absolute top-4 left-4 ${rarityColor} text-[10px] font-black px-2 py-1 rounded-md z-10 shadow-sm border border-white/20`}>
        {character.rarity}
      </div>
      
      <div className="flex flex-col h-full justify-between relative">
        <div className="flex justify-end items-start">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-white border border-white/20 backdrop-blur-md ${isUR ? 'bg-red-950' : 'bg-black/20'}`}>
            {character.attribute}
          </span>
        </div>
        
        <div className="mt-1 text-center flex-grow flex items-center justify-center">
          <span className={`text-6xl drop-shadow-[0_4px_12px_rgba(255,255,255,0.4)] ${isUR ? 'scale-125' : ''}`}>{character.icon}</span>
        </div>
        
        <div className="bg-white/80 p-3 rounded-[1.2rem] backdrop-blur-md shadow-sm border border-white/50">
          <h3 className="font-black text-[13px] text-slate-800 leading-tight mb-1 text-center truncate">{character.name}</h3>
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
            <div className="flex items-center gap-1">
              <span className="opacity-60 text-[9px]">HP</span>
              <span className="text-blue-500">{character.hp}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="opacity-60 text-[9px]">ATK</span>
              <span className="text-rose-600">{character.attack}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
