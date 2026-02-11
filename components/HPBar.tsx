
import React from 'react';
import { Attribute } from '../types';

interface HPBarProps {
  current: number;
  max: number;
  label: string;
  attribute?: Attribute;
}

export const HPBar: React.FC<HPBarProps> = ({ current, max, label, attribute }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  // 鮮やかなグラデーション（赤からピンク、瀕死時は黒ずんだ赤）
  const colorClass = percentage > 50 
    ? 'bg-gradient-to-r from-red-600 via-pink-500 to-rose-400' 
    : percentage > 20 
      ? 'bg-gradient-to-r from-orange-600 to-red-700' 
      : 'bg-gradient-to-r from-red-900 to-black';

  // 属性アイコン
  const getAttrIcon = () => {
    switch (attribute) {
      case Attribute.FLAME: return '☯️';
      case Attribute.WIND: return '🌟';
      case Attribute.SNOW: return '❄️';
      case Attribute.DARK: return '💎';
      default: return '⛩️';
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 px-1 font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 text-sm drop-shadow-none animate-pulse">{getAttrIcon()}</span>
          <span className="text-[12px] tracking-tighter truncate max-w-[80px]">{label}</span>
        </div>
        <span className="text-[10px] font-bungee tracking-tight">
          {current} <span className="text-[8px] opacity-70">/ {max}</span>
        </span>
      </div>
      
      {/* 金色の装飾枠（和風ファンタジー風） */}
      <div className="h-6 bg-black/80 rounded-sm border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4),inset_0_2px_4px_rgba(0,0,0,0.9)] p-[2.5px] relative overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-out rounded-sm ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
        {/* 装飾用の光沢ライン */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 pointer-events-none" />
      </div>
    </div>
  );
};
