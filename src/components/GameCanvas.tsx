import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Fish, Bullet, FloatingText, Coin, FISH_TYPES, FishType } from '../gameTypes';
import { Plus, Minus, Coins } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (score: number) => void;
}

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 768;
const CANNON_X = CANVAS_WIDTH / 2;
const CANNON_Y = CANVAS_HEIGHT - 20;

export default function GameCanvas({ onGameOver }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [coins, setCoins] = useState(1000);
  const [cannonLevel, setCannonLevel] = useState(1);
  const [score, setScore] = useState(0);

  // Mutable game state to avoid dependency issues in animation frame
  const gameState = useRef({
    fishes: [] as Fish[],
    bullets: [] as Bullet[],
    floatingTexts: [] as FloatingText[],
    animatingCoins: [] as Coin[],
    coins: 1000,
    score: 0,
    cannonLevel: 1,
    cannonAngle: 0,
    lastFishSpawn: 0,
    nextFishId: 0,
    nextBulletId: 0,
    nextTextId: 0,
    nextCoinId: 0,
    isRunning: true,
  });

  // Sync state to refs
  useEffect(() => {
    gameState.current.coins = coins;
    gameState.current.cannonLevel = cannonLevel;
    gameState.current.score = score;
  }, [coins, cannonLevel, score]);

  const spawnFish = useCallback((timestamp: number) => {
    const state = gameState.current;
    if (timestamp - state.lastFishSpawn > 1000 + Math.random() * 1000) {
      state.lastFishSpawn = timestamp;
      
      // Determine fish type (weighted random)
      const rand = Math.random();
      let typeIndex = 0;
      if (rand > 0.95) typeIndex = 6; // Shark
      else if (rand > 0.85) typeIndex = 5; // Turtle
      else if (rand > 0.7) typeIndex = 4; // Octopus
      else if (rand > 0.5) typeIndex = 3; // Squid
      else if (rand > 0.3) typeIndex = 2; // Puffer
      else if (rand > 0.1) typeIndex = 1; // Tropical
      
      const type = FISH_TYPES[typeIndex];
      const direction = Math.random() > 0.5 ? 1 : -1;
      const y = 50 + Math.random() * (CANVAS_HEIGHT - 200);
      const x = direction === 1 ? -type.size : CANVAS_WIDTH + type.size;
      const speedVariation = 0.8 + Math.random() * 0.4;
      
      state.fishes.push({
        id: state.nextFishId++,
        type,
        x,
        y,
        vx: type.baseSpeed * direction * speedVariation,
        vy: (Math.random() - 0.5) * 0.5,
        width: type.size,
        height: type.size,
        caught: false,
        catchTimer: 0,
        direction,
      });
    }
  }, []);

  const updatePhysics = useCallback(() => {
    const state = gameState.current;

    // Update fishes
    for (let i = state.fishes.length - 1; i >= 0; i--) {
      const fish = state.fishes[i];
      if (fish.caught) {
        fish.catchTimer--;
        if (fish.catchTimer <= 0) {
          // Spawn coins animation
          for (let c = 0; c < Math.min(5, Math.ceil(fish.type.value / 10)); c++) {
            state.animatingCoins.push({
              id: state.nextCoinId++,
              x: fish.x,
              y: fish.y,
              targetX: 50, // Coin UI X
              targetY: CANVAS_HEIGHT - 50, // Coin UI Y
              timer: 0,
            });
          }
          state.fishes.splice(i, 1);
        }
      } else {
        fish.x += fish.vx;
        fish.y += fish.vy;
        
        // Bounce off top/bottom slightly
        if (fish.y < 50 || fish.y > CANVAS_HEIGHT - 150) {
          fish.vy *= -1;
        }

        // Remove if out of bounds
        if ((fish.direction === 1 && fish.x > CANVAS_WIDTH + 100) ||
            (fish.direction === -1 && fish.x < -100)) {
          state.fishes.splice(i, 1);
        }
      }
    }

    // Update bullets
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const bullet = state.bullets[i];
      if (bullet.state === 'moving') {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        const distToTarget = Math.hypot(bullet.targetX - bullet.x, bullet.targetY - bullet.y);
        if (distToTarget < 10 || bullet.x < 0 || bullet.x > CANVAS_WIDTH || bullet.y < 0) {
          bullet.state = 'net';
          bullet.netRadius = 30 + bullet.level * 15;
          bullet.netTimer = 30; // frames
          bullet.maxNetTimer = 30;
          
          // Check collisions with fish
          state.fishes.forEach(fish => {
            if (fish.caught) return;
            const dist = Math.hypot(fish.x - bullet.x, fish.y - bullet.y);
            if (dist < bullet.netRadius + fish.width / 2) {
              // Hit! Calculate catch probability
              // Higher level cannon = better catch rate
              const levelMultiplier = 1 + (bullet.level - 1) * 0.2;
              const catchChance = fish.type.catchRate * levelMultiplier;
              
              if (Math.random() < catchChance) {
                fish.caught = true;
                fish.catchTimer = 30;
                
                // Add score and coins
                const reward = fish.type.value;
                setCoins(c => c + reward);
                setScore(s => s + reward);
                
                state.floatingTexts.push({
                  id: state.nextTextId++,
                  text: `+${reward}`,
                  x: fish.x,
                  y: fish.y - 20,
                  timer: 60,
                  maxTimer: 60,
                  color: '#fbbf24', // amber-400
                });
              }
            }
          });
        }
      } else if (bullet.state === 'net') {
        bullet.netTimer--;
        if (bullet.netTimer <= 0) {
          state.bullets.splice(i, 1);
        }
      }
    }

    // Update floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const text = state.floatingTexts[i];
      text.y -= 1;
      text.timer--;
      if (text.timer <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }

    // Update animating coins
    for (let i = state.animatingCoins.length - 1; i >= 0; i--) {
      const coin = state.animatingCoins[i];
      coin.timer += 0.05;
      const t = Math.min(1, coin.timer);
      // Ease in
      const ease = t * t;
      coin.x = coin.x + (coin.targetX - coin.x) * ease;
      coin.y = coin.y + (coin.targetY - coin.y) * ease;
      
      if (t >= 1) {
        state.animatingCoins.splice(i, 1);
      }
    }

  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0ea5e9'); // sky-500
    gradient.addColorStop(1, '#082f49'); // sky-900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw some bubbles (simple static or pseudo-random)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(Date.now() / 1000 + i) * 50) + (i * CANVAS_WIDTH / 20);
      const y = CANVAS_HEIGHT - ((Date.now() / 20 + i * 100) % CANVAS_HEIGHT);
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw fishes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    state.fishes.forEach(fish => {
      ctx.save();
      ctx.translate(fish.x, fish.y);
      
      if (fish.caught) {
        // Shake effect
        ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        ctx.globalAlpha = fish.catchTimer / 30;
      }

      if (fish.direction === -1) {
        ctx.scale(-1, 1);
      }
      
      ctx.font = `${fish.width}px Arial`;
      ctx.fillText(fish.type.emoji, 0, 0);
      ctx.restore();
    });

    // Draw bullets & nets
    state.bullets.forEach(bullet => {
      if (bullet.state === 'moving') {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
        
        // Draw bullet (glowing orb)
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(0, 0, 8 + bullet.level * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (bullet.state === 'net') {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        
        const alpha = bullet.netTimer / bullet.maxNetTimer;
        ctx.globalAlpha = alpha;
        
        // Draw net
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.netRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Net grid
        ctx.beginPath();
        for (let i = -bullet.netRadius; i <= bullet.netRadius; i += 20) {
          const limit = Math.sqrt(bullet.netRadius * bullet.netRadius - i * i);
          ctx.moveTo(i, -limit);
          ctx.lineTo(i, limit);
          ctx.moveTo(-limit, i);
          ctx.lineTo(limit, i);
        }
        ctx.stroke();
        
        ctx.restore();
      }
    });

    // Draw Cannon
    ctx.save();
    ctx.translate(CANNON_X, CANNON_Y);
    ctx.rotate(state.cannonAngle);
    
    // Base
    ctx.fillStyle = '#334155'; // slate-700
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI, true);
    ctx.fill();
    
    // Barrel
    ctx.fillStyle = '#475569'; // slate-600
    const barrelWidth = 20 + state.cannonLevel * 4;
    const barrelLength = 40 + state.cannonLevel * 5;
    ctx.fillRect(-barrelWidth / 2, -barrelLength, barrelWidth, barrelLength);
    
    // Decorations based on level
    ctx.fillStyle = '#fbbf24'; // amber-400
    for (let i = 0; i < state.cannonLevel; i++) {
      ctx.fillRect(-barrelWidth / 2 + 2, -barrelLength + 10 + i * 8, barrelWidth - 4, 4);
    }
    
    ctx.restore();

    // Draw floating texts
    state.floatingTexts.forEach(text => {
      ctx.save();
      ctx.globalAlpha = text.timer / text.maxTimer;
      ctx.fillStyle = text.color;
      ctx.font = 'bold 24px Arial';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    });

    // Draw animating coins
    ctx.font = '20px Arial';
    state.animatingCoins.forEach(coin => {
      ctx.fillText('🪙', coin.x, coin.y);
    });

  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (!gameState.current.isRunning) return;

    spawnFish(timestamp);
    updatePhysics();
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }

    // Check game over
    if (gameState.current.coins <= 0 && gameState.current.bullets.length === 0) {
      gameState.current.isRunning = false;
      onGameOver(gameState.current.score);
      return;
    }

    requestAnimationFrame(gameLoop);
  }, [spawnFish, updatePhysics, draw, onGameOver]);

  useEffect(() => {
    gameState.current.isRunning = true;
    const reqId = requestAnimationFrame(gameLoop);
    return () => {
      gameState.current.isRunning = false;
      cancelAnimationFrame(reqId);
    };
  }, [gameLoop]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Calculate scale in case CSS resizes the canvas
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Calculate angle
    const angle = Math.atan2(y - CANNON_Y, x - CANNON_X);
    // Restrict angle to point upwards
    if (angle > -0.1 && angle < Math.PI / 2) return; // Too far right/down
    if (angle < Math.PI && angle > Math.PI - 0.1) return; // Too far left/down

    gameState.current.cannonAngle = angle + Math.PI / 2; // Adjust for drawing

    const cost = cannonLevel * 10;
    if (coins >= cost) {
      setCoins(c => c - cost);
      
      const speed = 15;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      gameState.current.bullets.push({
        id: gameState.current.nextBulletId++,
        x: CANNON_X,
        y: CANNON_Y,
        targetX: x,
        targetY: y,
        vx,
        vy,
        level: cannonLevel,
        state: 'moving',
        netRadius: 0,
        netTimer: 0,
        maxNetTimer: 0,
      });
    } else {
      // Not enough coins feedback
      gameState.current.floatingTexts.push({
        id: gameState.current.nextTextId++,
        text: "Not enough coins!",
        x: CANNON_X,
        y: CANNON_Y - 50,
        timer: 60,
        maxTimer: 60,
        color: '#ef4444', // red-500
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const angle = Math.atan2(y - CANNON_Y, x - CANNON_X);
    if (angle < -0.1 && angle > -Math.PI + 0.1) {
      gameState.current.cannonAngle = angle + Math.PI / 2;
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden shadow-2xl ring-4 ring-sky-900">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        className="w-full h-full cursor-crosshair"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="bg-slate-900/80 backdrop-blur-sm text-amber-400 px-4 py-2 rounded-full font-bold text-xl flex items-center gap-2 border border-slate-700 shadow-lg">
            <Coins size={24} />
            <span>{coins}</span>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-full font-bold text-lg border border-slate-700 shadow-lg">
            Score: {score}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-sm p-3 rounded-full border border-slate-700 shadow-lg pointer-events-auto">
        <button 
          onClick={() => setCannonLevel(Math.max(1, cannonLevel - 1))}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors disabled:opacity-50"
          disabled={cannonLevel <= 1}
        >
          <Minus size={20} />
        </button>
        <div className="flex flex-col items-center min-w-[100px]">
          <span className="text-sky-400 font-bold text-sm uppercase tracking-wider">Cannon Lv.{cannonLevel}</span>
          <span className="text-amber-400 font-bold text-xs">Cost: {cannonLevel * 10}</span>
        </div>
        <button 
          onClick={() => setCannonLevel(Math.min(5, cannonLevel + 1))}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors disabled:opacity-50"
          disabled={cannonLevel >= 5}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
