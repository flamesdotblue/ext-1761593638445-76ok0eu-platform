import { useEffect, useRef } from 'react';

const NES = {
  bg: '#0A100E',
  dark: '#07110F',
  text: '#C4F0C2',
  accent: '#7CE8B5',
  hostile: '#F25F5C',
  ally: '#6BD6D3',
  platform: '#4E8C7A',
};

const wordWidth = (w) => Math.max(32, w.length * 12);

export default function Platformer({ worldTokens, actionQueue, consumeActions, onEnemyDefeated, onPlayerHit, stats }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let running = true;

    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * DPR);
      canvas.height = Math.floor(rect.height * DPR);
      ctx.imageSmoothingEnabled = false;
      ctx.scale(DPR, DPR);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const player = { x: 40, y: 20, vx: 0, vy: 0, w: 14, h: 18, onGround: false, facing: 1 };
    const camera = { x: 0, y: 0 };

    const groundY = 220;

    const getLayout = () => {
      // layout platforms and entities from worldTokens deterministically
      const platforms = [];
      const enemies = [];
      const allies = [];
      let xCursor = 40;
      let row = 0;

      for (let i = 0; i < worldTokens.length; i++) {
        const t = worldTokens[i];
        const width = wordWidth(t.word || 'WORD');
        const x = xCursor;
        const y = groundY - row * 40;

        if (t.type === 'platform') {
          platforms.push({ ...t, x, y, w: width, h: 16 });
        }
        if (t.type === 'enemy') {
          enemies.push({ ...t, x, y: y - 18, w: width, h: 16, dir: Math.random() < 0.5 ? -1 : 1 });
        }
        if (t.type === 'character') {
          allies.push({ ...t, x, y: y - 18, w: width, h: 16 });
        }

        xCursor += width + 28;
        if (xCursor > 680) {
          xCursor = 40;
          row = (row + 1) % 3;
        }
      }

      // baseline ground
      platforms.push({ word: 'GROUND', type: 'platform', x: -200, y: groundY, w: 1200, h: 18 });

      return { platforms, enemies, allies };
    };

    const game = {
      player,
      camera,
      t: 0,
      ...getLayout(),
    };
    stateRef.current = game;

    const jump = () => {
      if (game.player.onGround) {
        game.player.vy = -4.1;
        game.player.onGround = false;
      }
    };

    const handleActions = () => {
      if (!actionQueue || actionQueue.length === 0) return;
      for (const a of actionQueue) {
        if (a === 'JUMP') jump();
        if (a === 'POWER') {
          // small buff animation
          game.player.vx += game.player.facing * 0.6;
        }
      }
      consumeActions();
    };

    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') game.player.vx = -1.2;
      if (k === 'd' || k === 'arrowright') game.player.vx = 1.2;
      if (k === 'w' || k === ' ' || k === 'arrowup') jump();
    };
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') game.player.vx = 0;
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    const drawPixelRect = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    };

    const drawWordPlatform = (p) => {
      drawPixelRect(p.x - game.camera.x, p.y - game.camera.y, p.w, p.h, NES.platform);
      ctx.fillStyle = NES.text;
      ctx.font = '12px monospace';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.word, p.x + 4 - game.camera.x, p.y - 2 - game.camera.y);
    };

    const drawCharacter = (c, color) => {
      drawPixelRect(c.x - game.camera.x, c.y - 12 - game.camera.y, 12, 12, color);
      ctx.fillStyle = NES.text;
      ctx.font = '10px monospace';
      ctx.textBaseline = 'top';
      ctx.fillText(c.word.slice(0, 6), c.x + 14 - game.camera.x, c.y - 12 - game.camera.y);
    };

    const physics = () => {
      handleActions();
      // gravity
      game.player.vy += 0.18;
      if (game.player.vy > 4) game.player.vy = 4;

      // movement
      game.player.x += game.player.vx;
      game.player.y += game.player.vy;
      if (game.player.vx !== 0) game.player.facing = Math.sign(game.player.vx);

      // collisions with platforms
      game.player.onGround = false;
      for (const p of game.platforms) {
        // AABB
        const px = p.x, py = p.y, pw = p.w, ph = p.h;
        const ax1 = game.player.x, ay1 = game.player.y, ax2 = ax1 + game.player.w, ay2 = ay1 + game.player.h;
        const bx1 = px, by1 = py, bx2 = px + pw, by2 = py + ph;
        if (ax2 > bx1 && ax1 < bx2 && ay2 > by1 && ay1 < by2) {
          // resolve vertical first
          if (game.player.vy > 0 && ay2 - game.player.vy <= by1) {
            // landing on top
            game.player.y = by1 - game.player.h;
            game.player.vy = 0;
            game.player.onGround = true;
          } else if (game.player.vy < 0 && ay1 - game.player.vy >= by2) {
            // hit head
            game.player.y = by2;
            game.player.vy = 0.1;
          } else if (game.player.vx > 0) {
            game.player.x = bx1 - game.player.w;
          } else if (game.player.vx < 0) {
            game.player.x = bx2;
          }
        }
      }

      // enemies simple patrol and interactions
      for (const e of game.enemies) {
        e.x += 0.4 * e.dir;
        // bounce on edges of their word width
        if (Math.random() < 0.01) e.dir *= -1;

        // check collision with player
        const ax1 = game.player.x, ay1 = game.player.y, ax2 = ax1 + game.player.w, ay2 = ay1 + game.player.h;
        const bx1 = e.x, by1 = e.y, bx2 = bx1 + 12, by2 = by1 + 12;
        if (ax2 > bx1 && ax1 < bx2 && ay2 > by1 && ay1 < by2) {
          const fromAbove = game.player.vy > 0 && ay1 < by1 && ay2 - by1 < 10;
          if (fromAbove) {
            // stomp
            onEnemyDefeated(e.word);
            // remove enemy
            game.enemies = game.enemies.filter((x) => x !== e);
            game.player.vy = -3;
          } else {
            onPlayerHit();
            // small knockback
            game.player.vx = -game.player.facing * 1.2;
            game.player.vy = -2.0;
          }
        }
      }

      // camera follows
      game.camera.x = Math.max(0, game.player.x - 140);
      game.camera.y = 0;
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = NES.bg;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // subtle horizon
      ctx.fillStyle = NES.dark;
      ctx.fillRect(0 - game.camera.x, 238 - game.camera.y, rect.width * 2, 2);

      for (const p of game.platforms) drawWordPlatform(p);
      for (const a of game.allies) drawCharacter(a, NES.ally);
      for (const e of game.enemies) drawCharacter(e, NES.hostile);

      // Player sprite (simple knight-ish if GUARDIAN exists nearby)
      const nearGuardian = game.allies.some((a) => a.word === 'GUARDIAN' && Math.abs(a.x - game.player.x) < 80);
      const color = nearGuardian ? NES.ally : NES.accent;
      drawPixelRect(game.player.x - game.camera.x, game.player.y - game.camera.y, 14, 14, color);
      drawPixelRect(game.player.x + (game.player.facing > 0 ? 10 : -2) - game.camera.x, game.player.y + 4 - game.camera.y, 4, 4, NES.text);

      // Minimal HUD overlay
      ctx.fillStyle = NES.text;
      ctx.font = '10px monospace';
      ctx.fillText(`HP ${stats.hp}  XP ${stats.xp}  STR ${stats.str}  LV ${stats.lvl}`.toUpperCase(), 8, 14);
    };

    const loop = () => {
      if (!running) return;
      game.t += 1 / 60;
      physics();
      render();
      requestAnimationFrame(loop);
    };

    loop();

    return () => {
      running = false;
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [worldTokens, actionQueue, consumeActions, onEnemyDefeated, onPlayerHit, stats]);

  // Rebuild layout when tokens change
  useEffect(() => {
    if (!stateRef.current) return;
    // regenerate platforms/enemies/allies using current tokens
    const { platforms, enemies, allies } = (() => {
      const res = { platforms: [], enemies: [], allies: [] };
      let xCursor = 40; let row = 0; const groundY = 220;
      for (let i = 0; i < worldTokens.length; i++) {
        const t = worldTokens[i];
        const w = wordWidth(t.word || 'WORD');
        const x = xCursor; const y = groundY - row * 40;
        if (t.type === 'platform') res.platforms.push({ ...t, x, y, w, h: 16 });
        if (t.type === 'enemy') res.enemies.push({ ...t, x, y: y - 18, w, h: 16, dir: Math.random() < 0.5 ? -1 : 1 });
        if (t.type === 'character') res.allies.push({ ...t, x, y: y - 18, w, h: 16 });
        xCursor += w + 28; if (xCursor > 680) { xCursor = 40; row = (row + 1) % 3; }
      }
      res.platforms.push({ word: 'GROUND', type: 'platform', x: -200, y: 220, w: 1200, h: 18 });
      return res;
    })();
    stateRef.current.platforms = platforms;
    stateRef.current.enemies = enemies;
    stateRef.current.allies = allies;
  }, [worldTokens]);

  return (
    <div className="p-2">
      <div className="border border-[#20403A] bg-[#07110F] rounded overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-[320px]" />
      </div>
      <div className="text-[10px] text-[#7CE8B5] uppercase tracking-widest mt-2">Controls: A/D or Arrows to move, Space to jump. Verbs typed will also trigger actions.</div>
    </div>
  );
}
