import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HeroCover from './components/HeroCover';
import HUD from './components/HUD';
import TextParser from './components/TextParser';
import Platformer from './components/Platformer';

function useChiptune() {
  const audioRef = useRef(null);
  const gainRef = useRef(null);
  const isOnRef = useRef(false);
  const tempoRef = useRef(140);
  const rafRef = useRef();
  const stepRef = useRef(0);

  const start = useCallback(() => {
    if (isOnRef.current) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.08;
    master.connect(ctx.destination);
    audioRef.current = ctx;
    gainRef.current = master;
    isOnRef.current = true;

    const tick = () => {
      if (!audioRef.current) return;
      const ctxNow = audioRef.current.currentTime;
      const step = stepRef.current++;
      const secPerBeat = 60 / tempoRef.current;
      const scheduleTime = ctxNow + 0.05;

      const patternBass = [48, 48, 50, 48, 53, 48, 55, 48]; // C2-ish
      const patternLead = [60, 62, 64, 67, 64, 62, 60, 55];

      const noteBass = patternBass[step % patternBass.length];
      const noteLead = patternLead[step % patternLead.length];

      const squareNote = (midi, durBeats, vol = 0.12) => {
        const osc = audioRef.current.createOscillator();
        const gain = audioRef.current.createGain();
        osc.type = 'square';
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, scheduleTime);
        gain.gain.linearRampToValueAtTime(vol, scheduleTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, scheduleTime + durBeats * secPerBeat);
        osc.connect(gain);
        gain.connect(gainRef.current);
        osc.start(scheduleTime);
        osc.stop(scheduleTime + durBeats * secPerBeat + 0.02);
      };

      const triNote = (midi, durBeats, vol = 0.08) => {
        const osc = audioRef.current.createOscillator();
        const gain = audioRef.current.createGain();
        osc.type = 'triangle';
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, scheduleTime);
        gain.gain.linearRampToValueAtTime(vol, scheduleTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, scheduleTime + durBeats * secPerBeat);
        osc.connect(gain);
        gain.connect(gainRef.current);
        osc.start(scheduleTime);
        osc.stop(scheduleTime + durBeats * secPerBeat + 0.02);
      };

      // Bass every beat
      squareNote(noteBass, 0.95);
      // Lead syncopation
      if (step % 2 === 0) triNote(noteLead + 12, 0.5, 0.06);

      rafRef.current = setTimeout(tick, (secPerBeat * 1000) / 2);
    };

    tick();
  }, []);

  const stop = useCallback(() => {
    isOnRef.current = false;
    if (rafRef.current) clearTimeout(rafRef.current);
    if (audioRef.current) {
      audioRef.current.close();
    }
    audioRef.current = null;
  }, []);

  const sfx = useMemo(() => ({
    jump: () => {
      const ctx = audioRef.current; if (!ctx) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(600, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      g.gain.value = 0.12; g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      o.connect(g); g.connect(gainRef.current); o.start(); o.stop(ctx.currentTime + 0.22);
    },
    coin: () => {
      const ctx = audioRef.current; if (!ctx) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.07);
      g.gain.value = 0.1; g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      o.connect(g); g.connect(gainRef.current); o.start(); o.stop(ctx.currentTime + 0.1);
    },
    hit: () => {
      const ctx = audioRef.current; if (!ctx) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
      g.gain.value = 0.12; g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      o.connect(g); g.connect(gainRef.current); o.start(); o.stop(ctx.currentTime + 0.12);
    },
  }), []);

  return { start, stop, sfx, isActive: () => !!audioRef.current };
}

export default function App() {
  const [stats, setStats] = useState({ hp: 10, xp: 0, str: 1, lvl: 1 });
  const [inventory, setInventory] = useState([]);
  const [worldTokens, setWorldTokens] = useState([]);
  const [actionQueue, setActionQueue] = useState([]);
  const { start, stop, sfx, isActive } = useChiptune();

  const onWorldEvent = useCallback((events) => {
    // events: { type, word, tag, effect, x?, y? }
    setWorldTokens((prev) => {
      const merged = [...prev, ...events.filter((e) => e.type !== 'action')];
      // limit to a reasonable count to mimic NES constraints
      return merged.slice(-40);
    });
    const actions = events.filter((e) => e.type === 'action').map((e) => e.effect);
    if (actions.length) setActionQueue((prev) => [...prev, ...actions]);
  }, []);

  const onInventoryChange = useCallback((next) => setInventory(next), []);

  const onEnemyDefeated = useCallback((word) => {
    setStats((s) => {
      const newXp = s.xp + 5;
      const newLvl = 1 + Math.floor(newXp / 20);
      const leveled = newLvl > s.lvl ? { hp: s.hp + 2, str: s.str + 1 } : {};
      return { ...s, xp: newXp, lvl: newLvl, ...leveled };
    });
    sfx.coin();
  }, [sfx]);

  const onPlayerHit = useCallback(() => {
    setStats((s) => ({ ...s, hp: Math.max(0, s.hp - 1) }));
    sfx.hit();
  }, [sfx]);

  useEffect(() => {
    if (stats.hp <= 0) {
      // soft reset
      setWorldTokens([]);
    }
  }, [stats.hp]);

  return (
    <div className="min-h-screen w-full bg-black text-[#C4F0C2]">
      <HeroCover />

      <div className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col border border-[#4E8C7A] rounded-lg overflow-hidden bg-[#0E1A18]">
          <div className="px-3 py-2 bg-[#132522] text-xs uppercase tracking-widest text-[#7CE8B5]">Text Adventure Console</div>
          <TextParser
            onWorldEvent={onWorldEvent}
            inventory={inventory}
            setInventory={onInventoryChange}
            stats={stats}
            setStats={setStats}
            onPlaySfxJump={() => sfx.jump()}
          />
          <div className="px-3 py-2 flex items-center justify-between border-t border-[#20403A] bg-[#0B1513]">
            <button
              onClick={() => (isActive() ? stop() : start())}
              className="text-xs uppercase tracking-widest border border-[#4E8C7A] px-2 py-1 rounded hover:bg-[#132522]"
            >
              {isActive() ? 'Stop Chiptune' : 'Play Chiptune'}
            </button>
            <div className="text-[10px] text-[#7CE8B5]">Type commands like LOOK, TAKE KEY, USE KEY, JUMP, GO EAST</div>
          </div>
        </div>

        <div className="flex flex-col border border-[#4E8C7A] rounded-lg overflow-hidden bg-[#0E1A18]">
          <div className="px-3 py-2 bg-[#132522] text-xs uppercase tracking-widest text-[#7CE8B5]">Platformer / RPG</div>
          <Platformer
            worldTokens={worldTokens}
            actionQueue={actionQueue}
            consumeActions={() => setActionQueue([])}
            onEnemyDefeated={onEnemyDefeated}
            onPlayerHit={onPlayerHit}
            stats={stats}
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12">
        <HUD stats={stats} inventory={inventory} />
      </div>
    </div>
  );
}
