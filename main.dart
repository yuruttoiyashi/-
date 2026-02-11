
import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'dart:async';

void main() {
  runApp(const GensokyoSurvivorApp());
}

class GensokyoSurvivorApp extends StatelessWidget {
  const GensokyoSurvivorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '幻想郷Survivor',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        fontFamily: 'M PLUS Rounded 1c',
      ),
      home: const GameScreen(),
    );
  }
}

// --- Data Models ---

enum Attribute { snow, flame, wind, dark }
enum Rarity { N, R, SR, UR }
enum GamePhase { selection, battle, result, gacha }

class Character {
  final String id;
  final String name;
  final int hp;
  final int maxHp;
  final int attack;
  final Attribute attribute;
  final Rarity rarity;
  final Color color;
  final String icon;
  final String description;

  Character({
    required this.id,
    required this.name,
    required this.hp,
    required this.maxHp,
    required this.attack,
    required this.attribute,
    required this.rarity,
    required this.color,
    required this.icon,
    required this.description,
  });

  Character copyWith({int? currentHp, int? mHp}) {
    return Character(
      id: id,
      name: name,
      hp: currentHp ?? hp,
      maxHp: mHp ?? maxHp,
      attack: attack,
      attribute: attribute,
      rarity: rarity,
      color: color,
      icon: icon,
      description: description,
    );
  }
}

class GameItem {
  final String id;
  final String name;
  final int effectValue;
  final bool isFullHeal;
  final String icon;
  final String description;

  GameItem({
    required this.id,
    required this.name,
    required this.effectValue,
    required this.isFullHeal,
    required this.icon,
    required this.description,
  });
}

// --- Constants ---

final List<Character> masterCharacters = [
  Character(id: 'flandre', name: 'フランドール', hp: 80, maxHp: 80, attack: 120, attribute: Attribute.dark, rarity: Rarity.UR, color: const Color(0xFF4A0000), icon: '🦇💎', description: '破壊の吸血鬼。'),
  Character(id: 'reimu', name: '博麗 霊夢', hp: 140, maxHp: 140, attack: 28, attribute: Attribute.flame, rarity: Rarity.SR, color: Colors.red.shade600, icon: '☯️⛩️', description: '幻想郷の巫女。'),
  Character(id: 'marisa', name: '霧雨 魔理沙', hp: 100, maxHp: 100, attack: 60, attribute: Attribute.wind, rarity: Rarity.SR, color: Colors.yellow.shade800, icon: '🧹🌟', description: '普通の魔法使い。'),
  Character(id: 'cirno', name: 'チルノ', hp: 99, maxHp: 99, attack: 19, attribute: Attribute.snow, rarity: Rarity.N, color: Colors.blue.shade300, icon: '❄️🧊', description: 'あたい最強！'),
  Character(id: 'youmu', name: '魂魄 妖夢', hp: 150, maxHp: 150, attack: 42, attribute: Attribute.snow, rarity: Rarity.R, color: Colors.emerald.shade400, icon: '⚔️👻', description: '半分幽霊の庭師。'),
  Character(id: 'sakuya', name: '十六夜 咲夜', hp: 125, maxHp: 125, attack: 38, attribute: Attribute.snow, rarity: Rarity.SR, color: Colors.blue.shade700, icon: '🕰️🔪', description: '完璧で瀟洒な従者。'),
  Character(id: 'mokou', name: '藤原 妹紅', hp: 200, maxHp: 200, attack: 35, attribute: Attribute.flame, rarity: Rarity.SR, color: Colors.redAccent, icon: '🔥🎋', description: '不死鳥の化身。'),
];

final List<GameItem> masterItems = [
  GameItem(id: 'ohagi', name: 'おはぎ', effectValue: 40, isFullHeal: false, icon: '🍙', description: 'HPを40回復。'),
  GameItem(id: 'elixir', name: '蓬莱の薬', effectValue: 80, isFullHeal: false, icon: '🧪', description: 'HPを80回復。'),
  GameItem(id: 'cup', name: '宝杯', effectValue: 0, isFullHeal: true, icon: '🏆', description: 'HPを全回復。'),
];

// --- Main Screen ---

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with TickerProviderStateMixin {
  GamePhase _phase = GamePhase.selection;
  int _coins = 1000;
  List<String> _ownedIds = ['reimu', 'marisa', 'cirno'];
  Map<String, int> _inventory = {'ohagi': 3};
  List<Character> _playerTeam = [];
  String _difficulty = 'NORMAL';
  String _message = 'ちびキャラを3人選んでね⛩️';

  List<Character>? _currentCpuTeam;
  List<int> _playerHps = [];
  List<int> _cpuHps = [];
  int _playerIdx = 0;
  int _cpuIdx = 0;
  bool _isPlayerTurn = true;
  bool _isGuarding = false;
  bool _isItemMenuOpen = false;

  late AnimationController _cpuAnimController;
  late AnimationController _playerAnimController;
  bool _showWarning = false;
  bool _isGachaRolling = false;
  dynamic _gachaResult;

  @override
  void initState() {
    super.initState();
    _cpuAnimController = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _playerAnimController = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
  }

  @override
  void dispose() {
    _cpuAnimController.dispose();
    _playerAnimController.dispose();
    super.dispose();
  }

  void _addLog(String msg) {
    setState(() => _message = msg);
  }

  // --- Battle Logic ---

  double _getAttrMultiplier(Attribute from, Attribute to) {
    if (from == Attribute.dark) return 2.0;
    Map<Attribute, Attribute> strong = {
      Attribute.flame: Attribute.snow,
      Attribute.snow: Attribute.wind,
      Attribute.wind: Attribute.flame,
    };
    if (strong[from] == to) return 1.5;
    if (strong[to] == from) return 0.5;
    return 1.0;
  }

  void _startBattle() {
    if (_playerTeam.length < 3) return;

    final cpuMasterList = masterCharacters.where((c) => c.id != 'flandre').toList();
    cpuMasterList.shuffle();
    
    _currentCpuTeam = cpuMasterList.take(3).map((c) {
      double hpMul = _difficulty == 'EASY' ? 0.8 : (_difficulty == 'HARD' ? 1.5 : 1.0);
      int hp = (c.maxHp * hpMul).floor();
      return c.copyWith(currentHp: hp, mHp: hp);
    }).toList();

    setState(() {
      _playerHps = _playerTeam.map((c) => c.hp).toList();
      _cpuHps = _currentCpuTeam!.map((c) => c.hp).toList();
      _playerIdx = 0;
      _cpuIdx = 0;
      _isPlayerTurn = true;
      _isGuarding = false;
      _phase = GamePhase.battle;
      _message = 'バトル開始！相手は ${_currentCpuTeam![0].name}！';
    });
  }

  void _executeAttack() async {
    if (!_isPlayerTurn) return;
    setState(() => _isPlayerTurn = false);

    final pChar = _playerTeam[_playerIdx];
    final cChar = _currentCpuTeam![_cpuIdx];

    await _playerAnimController.forward();
    await _playerAnimController.reverse();

    double mul = _getAttrMultiplier(pChar.attribute, cChar.attribute);
    int damage = (pChar.attack * mul).floor();
    
    setState(() {
      _cpuHps[_cpuIdx] = math.max(0, _cpuHps[_cpuIdx] - damage);
      _addLog('${pChar.name}の攻撃！ $damageダメージ！');
    });

    await Future.delayed(const Duration(milliseconds: 1000));

    if (_cpuHps[_cpuIdx] <= 0) {
      _cpuDefeat();
    } else {
      _cpuTurn();
    }
  }

  void _cpuDefeat() {
    setState(() {
      int reward = _difficulty == 'HARD' ? 450 : (_difficulty == 'EASY' ? 100 : 150);
      _coins += reward;
      _cpuIdx++;
      if (_cpuIdx >= _currentCpuTeam!.length) {
        _phase = GamePhase.result;
      } else {
        _addLog('${_currentCpuTeam![_cpuIdx-1].name}を撃破！次は${_currentCpuTeam![_cpuIdx].name}だ！');
        _isPlayerTurn = true;
      }
    });
  }

  void _cpuTurn() async {
    if (_phase != GamePhase.battle) return;
    
    final pChar = _playerTeam[_playerIdx];
    final cChar = _currentCpuTeam![_cpuIdx];

    await _cpuAnimController.forward();
    await _cpuAnimController.reverse();

    double mul = _getAttrMultiplier(cChar.attribute, pChar.attribute);
    double diffMul = _difficulty == 'EASY' ? 0.7 : (_difficulty == 'HARD' ? 2.0 : 1.0);
    int damage = (cChar.attack * mul * diffMul).floor();
    if (_isGuarding) damage = (damage / 2).floor();

    setState(() {
      _playerHps[_playerIdx] = math.max(0, _playerHps[_playerIdx] - damage);
      _addLog('${cChar.name}の攻撃！ $damageダメージ！');
      _isGuarding = false;
    });

    await Future.delayed(const Duration(milliseconds: 1000));

    if (_playerHps[_playerIdx] <= 0) {
      _playerDefeat();
    } else {
      setState(() {
        _isPlayerTurn = true;
        _addLog('君の番だよ！');
      });
    }
  }

  void _playerDefeat() {
    setState(() {
      _playerIdx++;
      if (_playerIdx >= _playerTeam.length) {
        _phase = GamePhase.result;
      } else {
        _addLog('${_playerTeam[_playerIdx-1].name}が力尽きた！ゆけっ、${_playerTeam[_playerIdx].name}！');
        _isPlayerTurn = true;
      }
    });
  }

  void _handleGuard() {
    if (!_isPlayerTurn) return;
    setState(() {
      _isGuarding = true;
      _isPlayerTurn = false;
      _addLog('${_playerTeam[_playerIdx].name}は結界を張った！');
    });
    Future.delayed(const Duration(milliseconds: 800), _cpuTurn);
  }

  void _handleItemUse(GameItem item) {
    if (!_isPlayerTurn || (_inventory[item.id] ?? 0) <= 0) return;
    setState(() {
      int heal = item.isFullHeal ? _playerTeam[_playerIdx].maxHp : item.effectValue;
      _playerHps[_playerIdx] = math.min(_playerTeam[_playerIdx].maxHp, _playerHps[_playerIdx] + heal);
      _inventory[item.id] = _inventory[item.id]! - 1;
      _addLog('${_playerTeam[_playerIdx].name}は${item.name}を使った！');
      _isPlayerTurn = false;
      _isItemMenuOpen = false;
    });
    Future.delayed(const Duration(milliseconds: 800), _cpuTurn);
  }

  // --- Gacha Logic ---

  void _rollGacha(String type) async {
    int cost = type == 'CHAR' ? 100 : 50;
    if (_coins < cost || _isGachaRolling) return;

    setState(() {
      _coins -= cost;
      _isGachaRolling = true;
      _gachaResult = null;
    });

    await Future.delayed(const Duration(milliseconds: 2000));

    if (type == 'CHAR') {
      bool isUR = math.Random().nextDouble() < 0.15;
      Character won;
      if (isUR) {
        won = masterCharacters.firstWhere((c) => c.id == 'flandre');
        _showWarningEffect();
      } else {
        final others = masterCharacters.where((c) => c.id != 'flandre').toList();
        won = others[math.Random().nextInt(others.length)];
      }
      setState(() {
        if (!_ownedIds.contains(won.id)) _ownedIds.add(won.id);
        _gachaResult = won;
      });
    } else {
      final item = masterItems[math.Random().nextInt(masterItems.length)];
      setState(() {
        _inventory[item.id] = (_inventory[item.id] ?? 0) + 1;
        _gachaResult = item;
      });
    }

    setState(() => _isGachaRolling = false);
  }

  void _showWarningEffect() {
    setState(() => _showWarning = true);
    Future.delayed(const Duration(milliseconds: 2000), () => setState(() => _showWarning = false));
  }

  // --- UI Components ---

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(-0.3, -0.6),
            radius: 1.5,
            colors: [Color(0xFF2E081A), Color(0xFF1A0510)],
          ),
        ),
        child: Stack(
          children: [
            const SakuraBackground(),
            SafeArea(
              child: Column(
                children: [
                  _buildHeader(),
                  Expanded(child: _buildMainContent()),
                  _buildFooterPanel(),
                ],
              ),
            ),
            if (_showWarning) _buildWarningOverlay(),
            if (_isItemMenuOpen) _buildItemMenu(),
            if (_gachaResult != null || _isGachaRolling) _buildGachaOverlay(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.5),
        border: const Border(bottom: BorderSide(color: Colors.yellow, width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              _buildCoinCounter(),
              const SizedBox(width: 8),
              if (_phase == GamePhase.selection) _buildDifficultyToggle(),
            ],
          ),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('Gensokyo Survivor', style: TextStyle(color: Colors.red, fontWeight: FontWeight.black, fontSize: 10, letterSpacing: 2, fontStyle: FontStyle.italic)),
              Text('博麗神社 奉納所', style: TextStyle(color: Colors.white38, fontSize: 8)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildCoinCounter() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black45,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.yellow.withOpacity(0.5)),
      ),
      child: Row(
        children: [
          const Text('💰', style: TextStyle(fontSize: 14)),
          const SizedBox(width: 4),
          Text('$_coins', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.yellow)),
        ],
      ),
    );
  }

  Widget _buildDifficultyToggle() {
    return GestureDetector(
      onTap: () {
        setState(() {
          if (_difficulty == 'NORMAL') _difficulty = 'HARD';
          else if (_difficulty == 'HARD') _difficulty = 'EASY';
          else _difficulty = 'NORMAL';
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.indigo.withOpacity(0.8),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.yellow.withOpacity(0.5)),
        ),
        child: Text(
          _difficulty == 'HARD' ? '👹 Lunatic' : (_difficulty == 'EASY' ? '🏮 Easy' : '☯️ Normal'),
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.black, color: Colors.yellowAccent),
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    switch (_phase) {
      case GamePhase.selection: return _buildSelectionArea();
      case GamePhase.battle: return _buildBattleArea();
      case GamePhase.result: return _buildResultArea();
      case GamePhase.gacha: return _buildGachaArea();
    }
  }

  Widget _buildSelectionArea() {
    final chars = masterCharacters.where((c) => _ownedIds.contains(c.id)).toList();
    return Column(
      children: [
        _buildScrollMessage(_message),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.75,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: chars.length,
            itemBuilder: (ctx, idx) {
              final c = chars[idx];
              final isSelected = _playerTeam.any((p) => p.id == c.id);
              final order = isSelected ? _playerTeam.indexWhere((p) => p.id == c.id) : -1;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    if (isSelected) _playerTeam.removeWhere((p) => p.id == c.id);
                    else if (_playerTeam.length < 3) _playerTeam.add(c);
                  });
                },
                child: CharacterCard(character: c, isSelected: isSelected, order: order),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildBattleArea() {
    final cpu = _currentCpuTeam![_cpuIdx];
    final player = _playerTeam[_playerIdx];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Column(
        children: [
          const SizedBox(height: 10),
          // Enemy
          Align(
            alignment: Alignment.topRight,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 140,
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: List.generate(_currentCpuTeam!.length, (i) {
                          bool active = i == _cpuIdx;
                          bool dead = _cpuHps[i] <= 0;
                          return Container(width: 25, height: 4, margin: const EdgeInsets.only(left: 2), color: dead ? Colors.black45 : (active ? Colors.red : Colors.yellow.withOpacity(0.3)));
                        }),
                      ),
                      const SizedBox(height: 6),
                      HPBar(current: _cpuHps[_cpuIdx], max: cpu.maxHp, label: cpu.name),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SlideTransition(
                  position: Tween<Offset>(begin: Offset.zero, end: const Offset(-0.2, 0.1)).animate(_cpuAnimController),
                  child: _buildCharMiniIcon(cpu),
                ),
              ],
            ),
          ),
          
          const Spacer(),
          _buildScrollMessage(_message),
          const Spacer(),

          // Player
          Align(
            alignment: Alignment.bottomLeft,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                SlideTransition(
                  position: Tween<Offset>(begin: Offset.zero, end: const Offset(0.2, -0.1)).animate(_playerAnimController),
                  child: Stack(
                    children: [
                      _buildCharMiniIcon(player),
                      if (_isGuarding) const Positioned.fill(child: Center(child: Text('🔮', style: TextStyle(fontSize: 40)))),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 140,
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: List.generate(_playerTeam.length, (i) {
                          bool active = i == _playerIdx;
                          bool dead = _playerHps[i] <= 0;
                          return Container(width: 25, height: 4, margin: const EdgeInsets.only(right: 2), color: dead ? Colors.black45 : (active ? Colors.red : Colors.yellow.withOpacity(0.3)));
                        }),
                      ),
                      const SizedBox(height: 6),
                      HPBar(current: _playerHps[_playerIdx], max: player.maxHp, label: player.name),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  Widget _buildResultArea() {
    bool win = _cpuIdx >= _currentCpuTeam!.length;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(win ? '㊗️' : '🍵', style: const TextStyle(fontSize: 80)),
          const SizedBox(height: 20),
          Text(win ? 'VICTORY!' : 'DEFEAT...', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.black, fontStyle: FontStyle.italic)),
          const SizedBox(height: 40),
          OfudaButton(text: '博麗神社へ帰還', onTap: () {
            setState(() {
              _phase = GamePhase.selection;
              _playerTeam = [];
              _addLog('ちびキャラを3人選んでね⛩️');
            });
          }),
        ],
      ),
    );
  }

  Widget _buildGachaArea() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('🎋', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 30),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Column(
              children: [
                OfudaButton(text: '式神召喚 (100枚)', onTap: () => _rollGacha('CHAR'), enabled: _coins >= 100),
                const SizedBox(height: 12),
                OfudaButton(text: '宝具錬成 (50枚)', onTap: () => _rollGacha('ITEM'), enabled: _coins >= 50, isNavy: true),
              ],
            ),
          ),
          const SizedBox(height: 30),
          TextButton(onPressed: () => setState(() => _phase = GamePhase.selection), child: const Text('人里へ戻る', style: TextStyle(color: Colors.pinkAccent, decoration: TextDecoration.underline))),
        ],
      ),
    );
  }

  Widget _buildFooterPanel() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 15, 20, 25),
      decoration: const BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        border: Border(top: BorderSide(color: Colors.yellow, width: 2)),
      ),
      child: _phase == GamePhase.selection ? _buildSelectionFooter() : (_phase == GamePhase.battle ? _buildBattleFooter() : const SizedBox(height: 60)),
    );
  }

  Widget _buildSelectionFooter() {
    return Row(
      children: [
        Expanded(child: OfudaButton(text: '境界を越える ✨', onTap: _startBattle, enabled: _playerTeam.length == 3)),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: () => setState(() => _phase = GamePhase.gacha),
          child: Container(width: 55, height: 55, decoration: BoxDecoration(color: Colors.indigo.shade900, shape: BoxShape.circle, border: Border.all(color: Colors.yellow, width: 2)), child: const Center(child: Text('🎋', style: TextStyle(fontSize: 24)))),
        ),
      ],
    );
  }

  Widget _buildBattleFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildBattleAction('攻撃', '💮', _executeAttack),
        _buildBattleAction('防御', '💠', _handleGuard),
        Stack(
          clipBehavior: Clip.none,
          children: [
            _buildBattleAction('道具', '🍱', () => setState(() => _isItemMenuOpen = true)),
            Positioned(top: -5, right: -5, child: Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: Colors.red, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 1)), child: Text('${_inventory.values.fold(0, (a, b) => a + b)}', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold)))),
          ],
        ),
      ],
    );
  }

  Widget _buildBattleAction(String label, String icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: _isPlayerTurn ? onTap : null,
      child: Opacity(
        opacity: _isPlayerTurn ? 1.0 : 0.4,
        child: Container(
          width: 85, height: 60,
          decoration: BoxDecoration(color: const Color(0xFFFDF5E6), border: Border.all(color: const Color(0xFFB22222), width: 2), borderRadius: BorderRadius.circular(10)),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Text(icon, style: const TextStyle(fontSize: 22)), Text(label, style: const TextStyle(color: Color(0xFFB22222), fontWeight: FontWeight.black, fontSize: 10))]),
        ),
      ),
    );
  }

  Widget _buildCharMiniIcon(Character c) {
    return Container(
      width: 90, height: 110,
      decoration: BoxDecoration(color: c.color, border: Border.all(color: Colors.yellow, width: 3), borderRadius: BorderRadius.circular(15), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 10)]),
      child: Center(child: Text(c.icon, style: const TextStyle(fontSize: 45))),
    );
  }

  Widget _buildScrollMessage(String text) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [Colors.brown.shade200, Colors.orange.shade50, Colors.brown.shade200]),
        border: const Border.symmetric(horizontal: BorderSide(color: Color(0xFF8B4513), width: 3)),
      ),
      child: Text(text, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.black, fontSize: 12, fontStyle: FontStyle.italic)),
    );
  }

  Widget _buildItemMenu() {
    return Stack(
      children: [
        GestureDetector(onTap: () => setState(() => _isItemMenuOpen = false), child: Container(color: Colors.black54)),
        Center(
          child: Container(
            width: 300, padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(15), border: Border.all(color: Colors.brown, width: 4)),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('所持道具', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.black, fontSize: 18)),
                const SizedBox(height: 15),
                ...masterItems.map((item) {
                  int count = _inventory[item.id] ?? 0;
                  return Padding(padding: const EdgeInsets.only(bottom: 8), child: OfudaButton(text: '${item.name} (x$count)', onTap: () => _handleItemUse(item), enabled: count > 0));
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWarningOverlay() {
    return Container(color: Colors.red.withOpacity(0.3), child: const Center(child: Text('WARNING!', style: TextStyle(color: Colors.red, fontSize: 50, fontWeight: FontWeight.black, letterSpacing: 5))));
  }

  Widget _buildGachaOverlay() {
    return Container(
      color: Colors.black,
      child: Center(
        child: _isGachaRolling ? _buildMagicCircle() : Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('召喚完了！', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.yellow)),
            const SizedBox(height: 30),
            _gachaResult is Character ? CharacterCard(character: _gachaResult, isSelected: false) : Column(children: [Text(_gachaResult.icon, style: const TextStyle(fontSize: 80)), Text(_gachaResult.name, style: const TextStyle(fontSize: 20, color: Colors.white))]),
            const SizedBox(height: 40),
            OfudaButton(text: '受け入れる', onTap: () => setState(() => _gachaResult = null)),
          ],
        ),
      ),
    );
  }

  Widget _buildMagicCircle() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TweenAnimationBuilder(
          tween: Tween<double>(begin: 0, end: 1),
          duration: const Duration(seconds: 2),
          builder: (ctx, value, child) => Transform.rotate(angle: value * 2 * math.pi, child: Container(width: 250, height: 250, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.yellow, width: 5), boxShadow: const [BoxShadow(color: Colors.yellow, blurRadius: 30)]), child: const Center(child: Icon(Icons.star, color: Colors.yellow, size: 100)))),
        ),
        const SizedBox(height: 30),
        const Text('召喚中...', style: TextStyle(fontSize: 24, fontWeight: FontWeight.black, color: Colors.yellow)),
      ],
    );
  }
}

// --- Component Widgets ---

class CharacterCard extends StatelessWidget {
  final Character character;
  final bool isSelected;
  final int order;
  const CharacterCard({super.key, required this.character, required this.isSelected, this.order = -1});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: character.color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isSelected ? Colors.pinkAccent : Colors.white24, width: isSelected ? 4 : 1),
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(character.rarity.name, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)), Text(character.attribute.name.toUpperCase(), style: const TextStyle(fontSize: 8, color: Colors.white70))]),
                Expanded(child: Center(child: Text(character.icon, style: const TextStyle(fontSize: 50)))),
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.9), borderRadius: BorderRadius.circular(10)),
                  child: Column(children: [Text(character.name, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 10), textAlign: TextAlign.center), Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [Text('HP:${character.hp}', style: const TextStyle(color: Colors.blue, fontSize: 8)), Text('ATK:${character.attack}', style: const TextStyle(color: Colors.red, fontSize: 8))])]),
                )
              ],
            ),
          ),
          if (order != -1) Positioned(top: 5, right: 5, child: Container(width: 20, height: 20, decoration: const BoxDecoration(color: Colors.pinkAccent, shape: BoxShape.circle), child: Center(child: Text('${order + 1}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold))))),
        ],
      ),
    );
  }
}

class HPBar extends StatelessWidget {
  final int current;
  final int max;
  final String label;
  const HPBar({super.key, required this.current, required this.max, required this.label});

  @override
  Widget build(BuildContext context) {
    double percent = (current / max).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.black, color: Colors.white)),
        const SizedBox(height: 2),
        Container(
          height: 10,
          decoration: BoxDecoration(color: Colors.black54, border: Border.all(color: Colors.yellow, width: 1.5), borderRadius: BorderRadius.circular(2)),
          child: FractionallySizedBox(widthFactor: percent, alignment: Alignment.centerLeft, child: Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [Colors.red, Colors.pinkAccent])))),
        ),
      ],
    );
  }
}

class OfudaButton extends StatelessWidget {
  final String text;
  final VoidCallback onTap;
  final bool enabled;
  final bool isNavy;
  const OfudaButton({super.key, required this.text, required this.onTap, this.enabled = true, this.isNavy = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Opacity(
        opacity: enabled ? 1.0 : 0.4,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isNavy ? const Color(0xFF0C1445) : const Color(0xFFFDF5E6),
            border: Border.all(color: isNavy ? Colors.yellow : const Color(0xFFB22222), width: 3),
            borderRadius: BorderRadius.circular(8),
            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 4))],
          ),
          child: Center(child: Text(text, style: TextStyle(color: isNavy ? Colors.yellow : const Color(0xFFB22222), fontWeight: FontWeight.black, fontSize: 16))),
        ),
      ),
    );
  }
}

class SakuraBackground extends StatelessWidget {
  const SakuraBackground({super.key});
  @override
  Widget build(BuildContext context) {
    return Stack(children: List.generate(15, (i) => SakuraPetal(index: i)));
  }
}

class SakuraPetal extends StatefulWidget {
  final int index;
  const SakuraPetal({super.key, required this.index});
  @override
  State<SakuraPetal> createState() => _SakuraPetalState();
}

class _SakuraPetalState extends State<SakuraPetal> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late double _left;
  @override
  void initState() {
    super.initState();
    _left = math.Random().nextDouble();
    _ctrl = AnimationController(vsync: this, duration: Duration(milliseconds: 5000 + math.Random().nextInt(5000)))..repeat();
  }
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (ctx, child) {
        double y = MediaQuery.of(context).size.height * _ctrl.value;
        double x = MediaQuery.of(context).size.width * _left + math.sin(_ctrl.value * 5) * 30;
        return Positioned(top: y, left: x, child: Transform.rotate(angle: _ctrl.value * 10, child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFFFFB7C5), borderRadius: BorderRadius.only(topLeft: Radius.circular(8), bottomRight: Radius.circular(8))))));
      },
    );
  }
}
