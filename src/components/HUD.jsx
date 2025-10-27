export default function HUD({ stats, inventory }) {
  const bar = (value, max, color) => (
    <div className="h-2 w-full bg-[#10201C] border border-[#2B554B]">
      <div className="h-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  );

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-[#C4F0C2]">
      <div className="border border-[#4E8C7A] rounded p-3 bg-[#0E1A18]">
        <div className="text-xs uppercase tracking-widest text-[#7CE8B5] mb-2">Stats</div>
        <div className="text-sm">HP: {stats.hp} / 10</div>
        {bar(stats.hp, 10, '#7CE8B5')}
        <div className="mt-2 text-sm">XP: {stats.xp}</div>
        {bar(stats.xp % 20, 20, '#6BD6D3')}
        <div className="mt-2 text-sm">STR: {stats.str} • LVL: {stats.lvl}</div>
      </div>
      <div className="border border-[#4E8C7A] rounded p-3 bg-[#0E1A18] md:col-span-2">
        <div className="text-xs uppercase tracking-widest text-[#7CE8B5] mb-2">Inventory</div>
        <div className="flex flex-wrap gap-2 text-sm">
          {inventory.length === 0 ? (
            <div className="text-[#7CE8B5]/70 text-xs">Empty</div>
          ) : (
            inventory.map((it, i) => (
              <span key={i} className="px-2 py-1 border border-[#4E8C7A] rounded bg-[#0B1513] uppercase tracking-widest text-xs">{it}</span>
            ))
          )}
        </div>
        <div className="mt-3 text-[10px] text-[#7CE8B5] uppercase tracking-widest">Minimal NES-style HUD • Keep an eye on HP and XP</div>
      </div>
    </div>
  );
}
