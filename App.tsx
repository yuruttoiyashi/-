
import React, { useState, useMemo, useCallback } from 'react';
import { Character, GamePhase, BattleState, ActionType, Rarity, Attribute, TurnOwner, Difficulty, Item } from './types';
import { MASTER_CHARACTERS, MASTER_ITEMS, GACHA_COST_CHAR, GACHA_COST_ITEM, ATTRIBUTE_RELATIONS } from './constants';
import { CharacterCard } from './components/CharacterCard';
import { HPBar } from './components/HPBar';

const SakuraOverlay: React.FC = () => {
  const petals = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${8 + Math.random() * 8}s`,
      animationDelay: `${-Math.random() * 10}s`,
      size: `${8 + Math.random() * 8}px`,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, []);

  return (
    <div className="sakura-container overflow-hidden pointer-events-none fixed inset-0 z-[-1]">
      {petals.map((p) => (
        <div key={p.id} className="petal absolute top-[-10px]"
          style={{ 
            left: p.left, width: p.size, height: p.size, 
            animationDuration: p.animationDuration, animationDelay: p.animationDelay, opacity: p.opacity 
          }}
        />
      ))}
    </div>
  );
};

const DanmakuEffect: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-visible flex items-center justify-center">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="sparkle" style={{
          left: '50%', top: '50%',
          transform: `rotate(${i * 30}deg) translate(40px)`,
          animationDelay: `${Math.random() * 0.2}s`
        }} />
      ))}
    </div>
  );
};

const MiniHPList: React.FC<{ hps: number[], team: Character[], currentIdx: number, isCpu: boolean }> = ({ hps, team, currentIdx, isCpu }) => {
  return (
    <div className={`flex gap-1 ${isCpu ? 'justify-end' : 'justify-start'}`}>
      {team.map((char, i) => (
        <div key={i} className={`h-1.5 w-6 rounded-sm border border-yellow-600/40 overflow-hidden ${hps[i] <= 0 ? 'bg-red-950 opacity-40' : 'bg-black/60'}`}>
          <div 
            className={`h-full transition-all duration-500 ${i === currentIdx ? 'bg-gradient-to-r from-red-600 to-pink-500' : 'bg-yellow-500/30'}`} 
            style={{ width: `${Math.max(0, Math.min(100, (hps[i] / char.maxHp) * 100))}%` }} 
          />
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('SELECTION');
  const [coins, setCoins] = useState(1000);
  const [ownedIds, setOwnedIds] = useState<string[]>(['reimu', 'marisa', 'cirno']);
  const [inventory, setInventory] = useState<Record<string, number>>({ 'ohagi': 3 });
  const [playerTeam, setPlayerTeam] = useState<Character[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');

  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [animating, setAnimating] = useState<{player: string, cpu: string}>({player: '', cpu: ''});
  const [flash, setFlash] = useState(false);
  const [darkFlash, setDarkFlash] = useState(false);
  const [danmakuActive, setDanmakuActive] = useState(false);
  const [message, setMessage] = useState('ちびキャラを3人選んでね⛩️');
  const [isGachaRolling, setIsGachaRolling] = useState(false);
  const [gachaResult, setGachaResult] = useState<{ type: 'CHAR' | 'ITEM', data: Character | Item } | null>(null);
  const [isItemMenuOpen, setIsItemMenuOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const ownedCharacters = useMemo(() => MASTER_CHARACTERS.filter(c => ownedIds.includes(c.id)), [ownedIds]);

  const addLog = (msg: string) => setMessage(msg);

  const calculateDamage = useCallback((atk: number, from: Attribute, to: Attribute, diff: Difficulty, isCpuAttacking: boolean) => {
    let multiplier = 1.0;
    let effectMessage = "";
    
    if (from === Attribute.DARK) {
      multiplier = 2.0;
      effectMessage = "全てを破壊する力！💥";
    } else {
      if (ATTRIBUTE_RELATIONS[from].strong === to) { 
        multiplier = 1.5; effectMessage = "属性相性ばつぐん！✨"; 
      } else if (ATTRIBUTE_RELATIONS[from].weak === to) { 
        multiplier = 0.5; effectMessage = "いまひとつのようだ...⛄"; 
      }
    }

    if (isCpuAttacking) {
      if (diff === 'EASY') multiplier *= 0.7;
      if (diff === 'HARD') multiplier *= 2.0; // Lunatic
    }
    return { damage: Math.max(1, Math.floor(atk * multiplier)), effectMessage };
  }, []);

  const handlePlayerDefeat = useCallback((currentBattle: BattleState) => {
    const char = currentBattle.playerTeam[currentBattle.currentPlayerIdx];
    if (char.id === 'flandre') addLog('フラン「あーあ、壊れちゃった」');
    
    const nextIdx = currentBattle.currentPlayerIdx + 1;
    if (nextIdx >= currentBattle.playerTeam.length) { 
      addLog('敗北...人里に帰りましょう。'); 
      setTimeout(() => setPhase('RESULT'), 1000); 
    } else { 
      addLog(`${currentBattle.playerTeam[currentBattle.currentPlayerIdx].name}が力尽きた！`); 
      setBattleState(prev => prev ? ({ ...prev, currentPlayerIdx: nextIdx, turn: 'PLAYER' }) : null); 
    }
  }, []);

  const handleCpuDefeat = useCallback((currentBattle: BattleState) => {
    const char = currentBattle.playerTeam[currentBattle.currentPlayerIdx];
    if (char.id === 'flandre') addLog('フラン「きゅっとしてドカーン！」');

    const nextIdx = currentBattle.currentCpuIdx + 1;
    
    // 報酬計算
    let reward = 150;
    if (currentBattle.difficulty === 'EASY') reward = 100;
    if (currentBattle.difficulty === 'HARD') reward = 450; // Lunaticは3倍

    setCoins(prev => prev + reward);
    if (nextIdx >= currentBattle.cpuTeam.length) { 
      addLog(`勝利！お賽銭を${reward}枚ゲット！`); 
      setTimeout(() => setPhase('RESULT'), 1000); 
    } else { 
      addLog(`${currentBattle.cpuTeam[currentBattle.currentCpuIdx].name}を撃破！`); 
      setBattleState(prev => prev ? ({ ...prev, currentCpuIdx: nextIdx, turn: 'PLAYER' as TurnOwner }) : null); 
    }
  }, []);

  const executeCpuTurn = useCallback((currentBattle: BattleState) => {
    // Lunaticは攻撃が速い
    const delay = currentBattle.difficulty === 'HARD' ? 500 : 800;

    setTimeout(() => {
      setBattleState(prev => {
        if (!prev || prev.turn !== 'CPU') return prev;
        const cpuChar = prev.cpuTeam[prev.currentCpuIdx];
        const playerChar = prev.playerTeam[prev.currentPlayerIdx];

        setAnimating({ player: 'animate-shake', cpu: 'animate-attack-left' });
        setFlash(true); 
        setTimeout(() => setFlash(false), 200);

        setTimeout(() => {
          const { damage, effectMessage } = calculateDamage(cpuChar.attack, cpuChar.attribute, playerChar.attribute, prev.difficulty, true);
          const actualDamage = prev.isGuarding ? Math.floor(damage / 2) : damage;
          addLog(`${cpuChar.name}の攻撃！ ${actualDamage}ダメージ！`);
          if (effectMessage) addLog(effectMessage);

          setBattleState(b => {
            if (!b) return null;
            const newHps = [...b.playerCurrentHps];
            newHps[b.currentPlayerIdx] = Math.max(0, newHps[b.currentPlayerIdx] - actualDamage);
            const updated = { ...b, playerCurrentHps: newHps, isGuarding: false, turn: 'PLAYER' as TurnOwner };
            setAnimating({ player: '', cpu: '' });
            if (newHps[b.currentPlayerIdx] <= 0) handlePlayerDefeat(updated);
            return updated;
          });
        }, 400);
        return prev;
      });
    }, delay);
  }, [calculateDamage, handlePlayerDefeat]);

  const handleAction = (type: ActionType) => {
    if (!battleState || battleState.turn !== 'PLAYER' || animating.player || animating.cpu) return;
    if (type === 'ITEM') { setIsItemMenuOpen(true); return; }

    const playerChar = battleState.playerTeam[battleState.currentPlayerIdx];
    const cpuChar = battleState.cpuTeam[battleState.currentCpuIdx];

    if (type === 'ATTACK') {
      const isFlandre = playerChar.id === 'flandre';
      
      if (isFlandre) {
        setDarkFlash(true);
        setTimeout(() => setDarkFlash(false), 300);
        addLog(`フラン「禁弾『過去を刻む時計』！」`);
      }

      setAnimating({ player: 'animate-attack-right', cpu: 'animate-shake' });
      
      setTimeout(() => {
        const { damage, effectMessage } = calculateDamage(playerChar.attack, playerChar.attribute, cpuChar.attribute, battleState.difficulty, false);
        addLog(`${playerChar.name}の攻撃！ ${damage}ダメージ！`);
        if (effectMessage) addLog(effectMessage);

        setBattleState(prev => {
          if (!prev) return null;
          const newCpuHps = [...prev.cpuCurrentHps];
          newCpuHps[prev.currentCpuIdx] = Math.max(0, newCpuHps[prev.currentCpuIdx] - damage);
          const nextState = { ...prev, cpuCurrentHps: newCpuHps };
          setAnimating({ player: '', cpu: '' });

          if (newCpuHps[prev.currentCpuIdx] <= 0) {
            handleCpuDefeat(nextState);
          } else {
            const finalState = { ...nextState, turn: 'CPU' as TurnOwner };
            setBattleState(finalState);
            executeCpuTurn(finalState);
          }
          return nextState;
        });
      }, 400);

    } else if (type === 'GUARD') {
      addLog(`${playerChar.name}は結界を張った！`);
      const nextState = { ...battleState, isGuarding: true, turn: 'CPU' as TurnOwner };
      setBattleState(nextState);
      executeCpuTurn(nextState);
    }
  };

  const useItem = (itemId: string) => {
    if (!battleState || battleState.turn !== 'PLAYER' || animating.player) return;
    const item = MASTER_ITEMS.find(i => i.id === itemId);
    if (!item || !inventory[itemId] || inventory[itemId] <= 0) return;

    const char = battleState.playerTeam[battleState.currentPlayerIdx];
    let newHp = battleState.playerCurrentHps[battleState.currentPlayerIdx];
    newHp = item.type === 'HEAL_FIXED' ? Math.min(char.maxHp, newHp + item.effectValue) : char.maxHp;

    addLog(`${char.name}は「${item.name}」を使った！`);
    setDanmakuActive(true); 
    setTimeout(() => setDanmakuActive(false), 1000);

    setInventory(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    setBattleState(prev => {
      if (!prev) return null;
      const newHps = [...prev.playerCurrentHps];
      newHps[prev.currentPlayerIdx] = newHp;
      const nextState = { ...prev, playerCurrentHps: newHps, turn: 'CPU' as TurnOwner };
      setIsItemMenuOpen(false);
      executeCpuTurn(nextState);
      return nextState;
    });
  };

  const startBattle = () => {
    if (playerTeam.length < 3) return;
    
    // CPUチームの選出
    const cpuTeam = [...MASTER_CHARACTERS]
      .filter(c => c.id !== 'flandre')
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(c => {
        // 難易度によるHP補正
        let hpMultiplier = 1.0;
        if (difficulty === 'EASY') hpMultiplier = 0.8;
        if (difficulty === 'HARD') hpMultiplier = 1.5;
        const scaledHp = Math.floor(c.hp * hpMultiplier);
        return { ...c, hp: scaledHp, maxHp: scaledHp };
      });
    
    const flandreIdx = playerTeam.findIndex(c => c.id === 'flandre');
    if (flandreIdx !== -1) {
      addLog('フラン「私と遊んでくれるの？」');
    }

    setBattleState({
      playerTeam, cpuTeam, currentPlayerIdx: 0, currentCpuIdx: 0,
      playerCurrentHps: playerTeam.map(c => c.hp), cpuCurrentHps: cpuTeam.map(c => c.hp),
      isGuarding: false, difficulty, turn: 'PLAYER'
    });
    setPhase('BATTLE');
    addLog(`幻想郷バトル開始！ [${difficulty === 'HARD' ? 'Lunatic' : difficulty}] 相手は ${cpuTeam[0].name} ！`);
  };

  const handleGacha = (type: 'CHAR' | 'ITEM') => {
    const cost = type === 'CHAR' ? GACHA_COST_CHAR : GACHA_COST_ITEM;
    if (coins < cost || isGachaRolling) return;
    setCoins(prev => prev - cost);
    setIsGachaRolling(true);
    
    setTimeout(() => {
      if (type === 'CHAR') {
        const isUR = Math.random() < 0.15;
        let won: Character;
        if (isUR) {
          won = MASTER_CHARACTERS.find(c => c.id === 'flandre')!;
          setShowWarning(true);
          addLog("♪ U.N.オーエンは彼女なのか？ (Arrange)");
          setTimeout(() => setShowWarning(false), 2000);
        } else {
          won = MASTER_CHARACTERS.filter(c => c.id !== 'flandre')[Math.floor(Math.random() * (MASTER_CHARACTERS.length - 1))];
        }
        setGachaResult({ type: 'CHAR', data: won });
        setOwnedIds(prev => prev.includes(won.id) ? prev : [...prev, won.id]);
      } else {
        const item = MASTER_ITEMS[Math.floor(Math.random() * MASTER_ITEMS.length)];
        setGachaResult({ type: 'ITEM', data: item });
        setInventory(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
      }
      setIsGachaRolling(false);
    }, 2500);
  };

  const getDifficultyLabel = (diff: Difficulty) => {
    switch (diff) {
      case 'EASY': return '🏮 Easy';
      case 'NORMAL': return '☯️ Normal';
      case 'HARD': return '👹 Lunatic';
      default: return diff;
    }
  };

  return (
    <div className={`h-screen max-w-md mx-auto relative flex flex-col bg-[#1a0510] transition-colors duration-300 ${flash ? 'bg-white/30' : ''} ${darkFlash ? 'animate-dark-flash' : ''} overflow-hidden font-['M_PLUS_Rounded_1c'] safe-area-padding`}>
      <div className="aurora-bg fixed inset-0 z-[-10]" />
      <SakuraOverlay />

      {/* WARNING OVERLAY */}
      {showWarning && (
        <div className="fixed inset-0 z-[200] warning-overlay flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-black/90 px-10 py-6 border-y-[6px] border-red-700 shadow-[0_0_50px_rgba(185,28,28,0.8)]">
            <h2 className="text-red-600 text-6xl font-black animate-pulse font-bungee tracking-tighter">WARNING!</h2>
            <p className="text-white text-center font-black tracking-[0.4em] mt-3 uppercase">Destruction Detected</p>
          </div>
        </div>
      )}

      {/* ヘッダー (shrink-0) */}
      <div className="z-30 flex justify-between items-center p-3 bg-black/70 backdrop-blur-md border-b-2 border-yellow-600/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-red-950/40 px-3 py-1.5 rounded-full border border-yellow-500/30 shadow-inner">
            <span className="text-yellow-400 text-sm drop-shadow-md">💰</span>
            <span className="font-bungee text-white text-base tracking-wide">{coins}</span>
          </div>
          {phase === 'SELECTION' && (
            <button 
              onClick={() => {
                if (difficulty === 'NORMAL') setDifficulty('HARD');
                else if (difficulty === 'HARD') setDifficulty('EASY');
                else setDifficulty('NORMAL');
              }}
              className="bg-indigo-900/60 border border-yellow-500/50 text-[10px] text-yellow-100 font-black px-3 py-1.5 rounded-md shadow-md active:scale-95 transition-all"
            >
              {getDifficultyLabel(difficulty)}
            </button>
          )}
        </div>
        <div className="flex flex-col items-end">
          <div className="font-black text-red-500 text-[10px] tracking-[0.2em] uppercase italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Gensokyo Survivor</div>
          {phase === 'BATTLE' && battleState && (
             <div className="text-yellow-500/80 text-[8px] font-black tracking-widest">{getDifficultyLabel(battleState.difficulty)}</div>
          )}
        </div>
      </div>

      {/* メインエリア (flex-grow) */}
      <div className="flex-grow flex flex-col overflow-hidden relative">
        {phase === 'SELECTION' && (
          <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto scrollbar-hide pb-28">
            <div className="scroll-window px-6 py-4 mx-2 text-center">
              <p className="text-sm font-black text-slate-800 leading-tight">{message}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 px-2 pb-10">
              {ownedCharacters.map(char => (
                <CharacterCard key={char.id} character={char} isSelected={playerTeam.some(c => c.id === char.id)} order={playerTeam.findIndex(c => c.id === char.id)} onClick={() => {
                  if (playerTeam.find(c => c.id === char.id)) setPlayerTeam(prev => prev.filter(c => c.id !== char.id));
                  else if (playerTeam.length < 3) setPlayerTeam(prev => [...prev, char]);
                }} />
              ))}
            </div>
          </div>
        )}

        {phase === 'BATTLE' && battleState && (
          <div className="h-full flex flex-col p-3 justify-between relative">
            {/* 上段：相手エリア (flex-none) - サイズを縮小 */}
            <div className="flex-none flex justify-end items-start gap-4 pt-1">
              <div className="flex-grow max-w-[130px] text-right pt-2">
                <MiniHPList team={battleState.cpuTeam} hps={battleState.cpuCurrentHps} currentIdx={battleState.currentCpuIdx} isCpu={true} />
                <div className="mt-2 shadow-xl scale-95 origin-right">
                  <HPBar 
                    current={battleState.cpuCurrentHps[battleState.currentCpuIdx]} 
                    max={battleState.cpuTeam[battleState.currentCpuIdx].maxHp} 
                    label={battleState.cpuTeam[battleState.currentCpuIdx].name} 
                    attribute={battleState.cpuTeam[battleState.currentCpuIdx].attribute} 
                  />
                </div>
              </div>
              <div className={`transition-all duration-300 ${animating.cpu} shrink-0`}>
                <div className={`w-24 h-32 rounded-xl ${battleState.cpuTeam[battleState.currentCpuIdx].color} border-4 border-yellow-600/50 shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center relative overflow-hidden`}>
                   <span className="text-4xl drop-shadow-2xl">{battleState.cpuTeam[battleState.currentCpuIdx].icon}</span>
                   <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 中段：メッセージエリア (flex-grow) - 空間を制限 */}
            <div className="flex-grow flex items-center justify-center py-2 px-1 max-h-[120px]">
               <div className="scroll-window w-full px-6 py-4 z-50">
                 <p className="text-[13px] font-black text-slate-900 text-center leading-relaxed drop-shadow-sm italic">
                   {message}
                 </p>
               </div>
            </div>

            {/* 下段：自分エリア (flex-none) - 操作パネルとの境界を確保 */}
            <div className="flex-none flex justify-start items-end gap-4 mb-6 relative">
              <div className={`transition-all duration-300 ${animating.player} shrink-0 relative`}>
                <div className={`w-24 h-32 rounded-xl ${battleState.playerTeam[battleState.currentPlayerIdx].color} border-4 border-yellow-600/50 shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center relative overflow-hidden`}>
                  <span className="text-4xl drop-shadow-2xl">{battleState.playerTeam[battleState.currentPlayerIdx].icon}</span>
                  {battleState.isGuarding && <div className="absolute inset-0 bg-blue-500/40 backdrop-blur-[1px] flex items-center justify-center z-10"><span className="text-4xl animate-pulse">🔮</span></div>}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                </div>
                <DanmakuEffect active={danmakuActive} />
              </div>
              <div className="flex-grow max-w-[130px] text-left pb-2">
                <MiniHPList team={battleState.playerTeam} hps={battleState.playerCurrentHps} currentIdx={battleState.currentPlayerIdx} isCpu={false} />
                <div className="mt-2 shadow-xl scale-95 origin-left">
                  <HPBar 
                    current={battleState.playerCurrentHps[battleState.currentPlayerIdx]} 
                    max={battleState.playerTeam[battleState.currentPlayerIdx].maxHp} 
                    label={battleState.playerTeam[battleState.currentPlayerIdx].name} 
                    attribute={battleState.playerTeam[battleState.currentPlayerIdx].attribute} 
                  />
                </div>
              </div>
            </div>

            {/* 道具メニュー */}
            {isItemMenuOpen && (
              <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md p-6 flex flex-col justify-end">
                <div className="scroll-window rounded-xl p-6 shadow-2xl animate-in slide-in-from-bottom">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-slate-900 underline decoration-red-700 decoration-4">所持道具</h3>
                    <button onClick={() => setIsItemMenuOpen(false)} className="text-slate-500 font-black hover:text-red-700 transition-colors uppercase text-xs">閉じる</button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto px-1">
                    {MASTER_ITEMS.map(item => {
                      const count = inventory[item.id] || 0;
                      return (
                        <button key={item.id} disabled={count <= 0} onClick={() => useItem(item.id)} className={`w-full flex items-center justify-between p-3 rounded-lg ofuda-button shadow-md ${count > 0 ? '' : 'opacity-40 grayscale pointer-events-none'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-3xl drop-shadow-sm">{item.icon}</span>
                            <div className="text-left">
                              <p className="font-black text-red-800 text-sm">{item.name}</p>
                              <p className="text-[10px] text-slate-600 font-bold leading-tight">{item.description}</p>
                            </div>
                          </div>
                          <span className="font-black text-xl text-red-700 border-l border-red-200 pl-3">x{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="h-32" />
              </div>
            )}
          </div>
        )}

        {phase === 'GACHA' && (
          <div className="h-full flex flex-col items-center justify-center p-4 relative overflow-y-auto scrollbar-hide">
            {isGachaRolling ? (
              <div className="flex flex-col items-center gap-8 py-10">
                <div className="magic-circle" />
                <p className="text-3xl font-black text-yellow-500 animate-pulse tracking-[0.5em] drop-shadow-[0_0_15px_rgba(234,179,8,1)]">召喚中...</p>
              </div>
            ) : gachaResult ? (
              <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-2xl p-6 animate-in zoom-in ${(gachaResult.type === 'CHAR' && (gachaResult.data as Character).rarity === Rarity.UR) ? 'ur-flashing' : 'bg-black/95'}`}>
                <p className="text-2xl font-black text-white mb-6 drop-shadow-[0_5px_15px_rgba(0,0,0,1)] text-center italic leading-tight">
                  {(gachaResult.type === 'CHAR' && (gachaResult.data as Character).rarity === Rarity.UR) ? '⚠ 破壊的存在の顕現 ⚠' : gachaResult.type === 'CHAR' ? '新たなる仲間の降臨！' : '秘宝の錬成に成功！'}
                </p>
                
                <div className="w-full max-w-[240px] mb-8 p-3 border-[4px] border-yellow-500 rounded-[2rem] bg-white/5 backdrop-blur-sm shadow-[0_0_40px_rgba(234,179,8,0.3)] flex flex-col items-center transform transition-transform scale-95">
                  {gachaResult.type === 'CHAR' ? (
                    <div className="w-full h-auto max-h-[35vh] overflow-hidden flex items-center justify-center">
                      <CharacterCard character={gachaResult.data as Character} isSelected={false} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-6">
                      <span className="text-[80px] mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] animate-bounce">{(gachaResult.data as Item).icon}</span>
                      <h3 className="text-xl font-black text-white italic tracking-widest">{(gachaResult.data as Item).name}</h3>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setGachaResult(null)} 
                  className="px-12 py-3 ofuda-button-navy rounded-full font-black text-lg shadow-2xl transition-all active:translate-y-1 hover:brightness-125"
                >
                  受け入れる
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-6 w-full px-4 py-6">
                <div className="text-[100px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] animate-bounce leading-none">🎋</div>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button 
                    onClick={() => handleGacha('CHAR')} 
                    disabled={coins < GACHA_COST_CHAR} 
                    className={`py-4 rounded-2xl font-black text-lg border-4 transition-all ofuda-button shadow-2xl text-red-800 active:scale-95 ${coins < GACHA_COST_CHAR ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:brightness-110'}`}
                  >
                    式神召喚 <span className="text-xs opacity-60 ml-1">(100枚)</span>
                  </button>
                  <button 
                    onClick={() => handleGacha('ITEM')} 
                    disabled={coins < GACHA_COST_ITEM} 
                    className={`py-4 rounded-2xl font-black text-lg border-4 transition-all ofuda-button-navy shadow-2xl active:scale-95 ${coins < GACHA_COST_ITEM ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:brightness-110'}`}
                  >
                    宝具錬成 <span className="text-xs opacity-60 ml-1">(50枚)</span>
                  </button>
                </div>
                <button 
                  onClick={() => setPhase('SELECTION')} 
                  className="text-pink-300 font-black text-base underline decoration-pink-500 underline-offset-4 decoration-2 hover:text-white transition-colors py-2"
                >
                  人里へ戻る
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'RESULT' && (
           <div className="h-full flex flex-col items-center justify-center p-8 space-y-10 text-center">
             <span className="text-[120px] drop-shadow-[0_0_40px_rgba(255,255,255,0.2)] animate-pulse">
               {battleState?.cpuCurrentHps.every(hp => hp <= 0) ? '㊗️' : '🍵'}
             </span>
             <h2 className="text-6xl font-black text-white italic drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)] tracking-tighter">
               {battleState?.cpuCurrentHps.every(hp => hp <= 0) ? 'VICTORY!' : 'DEFEAT...'}
             </h2>
             <button onClick={() => { setPhase('SELECTION'); setPlayerTeam([]); setBattleState(null); }} className="w-full max-w-xs py-5 ofuda-button rounded-full font-black text-2xl shadow-[0_12px_24px_rgba(0,0,0,0.6)] text-red-800 border-4">博麗神社へ帰還</button>
           </div>
        )}
      </div>

      {/* フッター操作パネル (shrink-0) - 高さを圧縮し最下部に固定 */}
      <div className="z-40 bg-black/90 backdrop-blur-2xl border-t-4 border-yellow-600/40 rounded-t-[3rem] p-5 shrink-0 pb-8 shadow-[0_-8px_25px_rgba(0,0,0,0.6)]">
        {phase === 'SELECTION' && (
          <div className="flex gap-4 h-16">
            <button 
              disabled={playerTeam.length < 3} 
              onClick={startBattle} 
              className={`flex-grow rounded-full font-black text-xl border-4 shadow-[0_8px_15px_rgba(0,0,0,0.4)] transition-all transform active:scale-95 ${playerTeam.length === 3 ? 'bg-gradient-to-b from-red-600 to-red-900 border-yellow-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-600 grayscale'}`}
            >
              境界を越える ✨
            </button>
            <button onClick={() => setPhase('GACHA')} className="bg-indigo-900 w-20 rounded-full border-4 border-indigo-400 flex items-center justify-center text-3xl shadow-2xl hover:bg-indigo-700 transition-colors">🎋</button>
          </div>
        )}

        {phase === 'BATTLE' && battleState && (
          <div className="grid grid-cols-3 gap-4 h-16">
            <button onClick={() => handleAction('ATTACK')} disabled={battleState.turn !== 'PLAYER' || !!animating.player} className="flex flex-col items-center justify-center ofuda-button rounded-2xl border-[3px] shadow-lg text-red-800 disabled:opacity-30 disabled:grayscale transition-all hover:brightness-110">
              <span className="text-2xl">💮</span>
              <span className="text-[10px] font-black uppercase tracking-widest">攻撃</span>
            </button>
            <button onClick={() => handleAction('GUARD')} disabled={battleState.turn !== 'PLAYER' || !!animating.player} className="flex flex-col items-center justify-center ofuda-button rounded-2xl border-[3px] shadow-lg text-red-800 disabled:opacity-30 disabled:grayscale transition-all hover:brightness-110">
              <span className="text-2xl">💠</span>
              <span className="text-[10px] font-black uppercase tracking-widest">防御</span>
            </button>
            <button onClick={() => handleAction('ITEM')} disabled={battleState.turn !== 'PLAYER' || !!animating.player} className="relative flex flex-col items-center justify-center ofuda-button rounded-2xl border-[3px] shadow-lg text-red-800 disabled:opacity-30 disabled:grayscale transition-all hover:brightness-110">
              <span className="text-2xl">🍱</span>
              <span className="text-[10px] font-black uppercase tracking-widest">道具</span>
              <span className="absolute -top-2 -right-2 bg-red-700 text-white text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-yellow-400 shadow-md animate-bounce">
                {Object.values(inventory).reduce((a, b) => a + b, 0)}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
