import { useEffect, useMemo, useRef, useState } from 'react';

const NEGATIVE_WORDS = ['FEAR', 'DOUBT', 'PAIN', 'CURSE', 'SHADOW', 'ABYSS'];
const PLATFORM_WORDS = ['BRIDGE', 'PATH', 'PLATFORM', 'WORD', 'STONE', 'ABYSS'];
const CHARACTER_WORDS = ['GUARDIAN', 'MERCHANT', 'SPIRIT', 'ALLY'];

export default function TextParser({ onWorldEvent, inventory, setInventory, stats, setStats, onPlaySfxJump }) {
  const [log, setLog] = useState([
    'You awaken in a room woven from letters. The floor spells PATH. A distant word hums: GUARDIAN.',
    'Type LOOK, TAKE, USE, GO, or verbs like JUMP. Words can become platforms.'
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [log]);

  const pushLog = (line) => setLog((l) => [...l, line]);

  const makeEvent = (word) => {
    const W = word.toUpperCase();
    if (NEGATIVE_WORDS.includes(W)) return { type: 'enemy', word: W, tag: 'hostile' };
    if (CHARACTER_WORDS.includes(W)) return { type: 'character', word: W, tag: 'npc' };
    if (PLATFORM_WORDS.includes(W)) return { type: 'platform', word: W, tag: 'terrain' };
    if (W.length > 2) return { type: 'platform', word: W, tag: 'terrain' };
    return null;
  };

  const parse = (raw) => {
    const line = raw.trim();
    if (!line) return;
    const upper = line.toUpperCase();
    const tokens = upper.split(/\s+/g);

    // basic commands
    if (upper === 'LOOK') {
      pushLog('Letters quiver. Some nouns may manifest. You see: BRIDGE, ABYSS, GUARDIAN, KEY.');
      const events = ['BRIDGE', 'ABYSS', 'GUARDIAN'].map(makeEvent).filter(Boolean);
      onWorldEvent(events);
      return;
    }

    if (upper.startsWith('TAKE ')) {
      const item = upper.replace('TAKE ', '').trim();
      if (!item) return;
      if (!inventory.includes(item)) {
        const next = [...inventory, item];
        setInventory(next);
        pushLog(`Taken: ${item}`);
        const ev = makeEvent(item);
        if (ev) onWorldEvent([ev]);
      } else {
        pushLog(`You already have ${item}.`);
      }
      return;
    }

    if (upper.startsWith('USE ')) {
      const item = upper.replace('USE ', '').trim();
      if (!item) return;
      if (inventory.includes(item)) {
        pushLog(`You use the ${item}. The world shifts.`);
        onWorldEvent([{ type: 'action', effect: 'POWER' }]);
        if (item === 'KEY') {
          onWorldEvent([{ type: 'platform', word: 'GATE', tag: 'terrain' }]);
        }
      } else {
        pushLog(`You don't have ${item}.`);
      }
      return;
    }

    if (upper.startsWith('GO ')) {
      const dir = upper.replace('GO ', '').trim();
      pushLog(`You move ${dir}. New words approach: PATH, STONE.`);
      onWorldEvent([
        { type: 'platform', word: 'PATH', tag: 'terrain' },
        { type: 'platform', word: 'STONE', tag: 'terrain' }
      ]);
      return;
    }

    if (upper === 'JUMP') {
      pushLog('You leap.');
      onWorldEvent([{ type: 'action', effect: 'JUMP' }]);
      onPlaySfxJump();
      return;
    }

    if (upper.startsWith('SAY ')) {
      const said = upper.replace('SAY ', '').trim();
      pushLog(`Your voice echoes: ${said}`);
      const ev = makeEvent(said);
      if (ev) onWorldEvent([ev]);
      return;
    }

    // Free-form: extract nouns/verbs
    const evts = tokens.map(makeEvent).filter(Boolean);
    if (evts.length) {
      pushLog(`Words take shape: ${evts.map((e) => e.word).join(', ')}`);
      onWorldEvent(evts);
    } else {
      pushLog("Nothing happens. Perhaps stronger words.");
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    parse(input);
    setInput('');
  };

  return (
    <div className="flex flex-col grow min-h-[360px]">
      <div ref={listRef} className="grow overflow-auto p-3 space-y-2 font-mono text-xs leading-relaxed tracking-widest uppercase">
        {log.map((l, i) => (
          <div key={i} className="text-[#C4F0C2]">{l}</div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="p-2 border-t border-[#20403A] bg-[#0B1513] flex gap-2">
        <input
          className="grow bg-[#07110F] text-[#C4F0C2] px-3 py-2 outline-none border border-[#1E3B35] rounded text-xs tracking-widest uppercase placeholder:text-[#7CE8B5]/50"
          placeholder="Enter command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="px-3 py-2 text-xs uppercase tracking-widest border border-[#4E8C7A] rounded hover:bg-[#132522] text-[#7CE8B5]">Send</button>
      </form>
    </div>
  );
}
