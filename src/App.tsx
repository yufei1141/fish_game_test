import React, { useEffect, useRef, useState } from 'react';

// --- Game Constants & Types ---
const FISH_TYPES = [
  { emoji: '🐟', points: 10, speed: 1.2, radius: 20, catchRate: 0.9, size: 40 },
  { emoji: '🐠', points: 20, speed: 1.8, radius: 20, catchRate: 0.75, size: 40 },
  { emoji: '🐡', points: 30, speed: 0.9, radius: 25, catchRate: 0.65, size: 50 },
  { emoji: '🦑', points: 50, speed: 2.0, radius: 30, catchRate: 0.5, size: 60 },
  { emoji: '🐢', points: 80, speed: 0.7, radius: 35, catchRate: 0.4, size: 70 },
  { emoji: '🦈', points: 100, speed: 2.5, radius: 45, catchRate: 0.3, size: 90 },
];

const BULLET_COST = 2; // Decreased from 5

interface Fish {
  id: number;
  type: typeof FISH_TYPES[0];
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Net {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  vy: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(1000);
  
  const gameState = useRef({
    score: 1000,
    fishes: [] as Fish[],
    bullets: [] as Bullet[],
    nets: [] as Net[],
    particles: [] as Particle[],
    cannonAngle: 0,
    lastFishSpawn: 0,
    fishIdCounter: 0,
    bulletIdCounter: 0,
    netIdCounter: 0,
    particleIdCounter: 0,
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameState.current.width = canvas.width;
      gameState.current.height = canvas.height;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      gameState.current.mouseX = x;
      gameState.current.mouseY = y;
      
      const cannonX = canvas.width / 2;
      const cannonY = canvas.height - 20; // Slightly above bottom
      gameState.current.cannonAngle = Math.atan2(y - cannonY, x - cannonX);
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleClick = () => {
      const state = gameState.current;
      if (state.score < BULLET_COST) return;
      
      state.score -= BULLET_COST;
      setScore(state.score);

      const cannonX = state.width / 2;
      const cannonY = state.height - 20;
      const speed = 18; // Faster bullets
      
      state.bullets.push({
        id: state.bulletIdCounter++,
        x: cannonX + Math.cos(state.cannonAngle) * 60,
        y: cannonY + Math.sin(state.cannonAngle) * 60,
        vx: Math.cos(state.cannonAngle) * speed,
        vy: Math.sin(state.cannonAngle) * speed,
        radius: 10, // Larger bullets
      });
    };
    window.addEventListener('mousedown', handleClick);

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      const state = gameState.current;

      // Spawn Fish
      if (time - state.lastFishSpawn > 800) { // Spawn faster
        if (state.fishes.length < 25) { // More fish
          const type = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
          const isLeft = Math.random() > 0.5;
          const y = Math.random() * (state.height - 250) + 50;
          
          state.fishes.push({
            id: state.fishIdCounter++,
            type,
            x: isLeft ? -50 : state.width + 50,
            y,
            vx: (isLeft ? 1 : -1) * type.speed * (0.8 + Math.random() * 0.4),
            vy: (Math.random() - 0.5) * 0.5,
          });
        }
        state.lastFishSpawn = time;
      }

      // Update Fishes
      state.fishes.forEach(fish => {
        fish.x += fish.vx;
        fish.y += fish.vy;
        if (fish.y < 50 || fish.y > state.height - 150) fish.vy *= -1;
      });
      state.fishes = state.fishes.filter(f => f.x > -100 && f.x < state.width + 100);

      // Update Bullets
      state.bullets.forEach(bullet => {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
      });
      state.bullets = state.bullets.filter(b => 
        b.x > 0 && b.x < state.width && b.y > 0 && b.y < state.height
      );

      // Update Nets
      state.nets.forEach(net => net.life--);
      state.nets = state.nets.filter(n => n.life > 0);

      // Update Particles
      state.particles.forEach(p => {
        p.y += p.vy;
        p.life--;
      });
      state.particles = state.particles.filter(p => p.life > 0);

      // Collision Detection
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        let hit = false;

        for (let j = state.fishes.length - 1; j >= 0; j--) {
          const fish = state.fishes[j];
          const dx = bullet.x - fish.x;
          const dy = bullet.y - fish.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < bullet.radius + fish.type.radius + 10) { // More forgiving collision
            hit = true;
            
            state.nets.push({
              id: state.netIdCounter++,
              x: fish.x,
              y: fish.y,
              radius: 80, // Larger net
              life: 40,
              maxLife: 40,
            });

            if (Math.random() < fish.type.catchRate) {
              state.score += fish.type.points;
              setScore(state.score);
              
              state.particles.push({
                id: state.particleIdCounter++,
                x: fish.x,
                y: fish.y,
                text: `+${fish.type.points}`,
                life: 60,
                maxLife: 60,
                color: '#FFD700',
                vy: -2,
              });

              state.fishes.splice(j, 1);
            }
            break;
          }
        }

        if (hit) {
          state.bullets.splice(i, 1);
        }
      }

      // --- DRAW ---
      
      // Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
      gradient.addColorStop(0, '#0a4b78'); // Brighter ocean top
      gradient.addColorStop(1, '#02183b'); // Deep ocean bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, state.width, state.height);

      // Light rays
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(state.width * 0.2, 0);
      ctx.lineTo(state.width * 0.4, 0);
      ctx.lineTo(state.width * 0.6 + Math.sin(time * 0.001) * 100, state.height);
      ctx.lineTo(state.width * 0.1 + Math.sin(time * 0.001) * 100, state.height);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(state.width * 0.6, 0);
      ctx.lineTo(state.width * 0.9, 0);
      ctx.lineTo(state.width * 0.8 + Math.cos(time * 0.001) * 100, state.height);
      ctx.lineTo(state.width * 0.4 + Math.cos(time * 0.001) * 100, state.height);
      ctx.fill();
      ctx.restore();

      // Bubbles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for(let i=0; i<15; i++) {
        const bx = (time * 0.03 + i * 150) % state.width;
        const by = state.height - ((time * 0.08 + i * 70) % state.height);
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (i%6), 0, Math.PI * 2);
        ctx.fill();
      }

      // Fishes
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      state.fishes.forEach(fish => {
        ctx.save();
        ctx.translate(fish.x, fish.y);
        if (fish.vx > 0) {
          ctx.scale(-1, 1);
        }
        // Add slight wobble
        ctx.rotate(Math.sin(time * 0.005 + fish.id) * 0.1);
        ctx.font = `${fish.type.size}px Arial`;
        // Shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.fillText(fish.type.emoji, 0, 0);
        ctx.restore();
      });

      // Nets
      state.nets.forEach(net => {
        ctx.save();
        ctx.translate(net.x, net.y);
        const alpha = net.life / net.maxLife;
        ctx.strokeStyle = `rgba(100, 255, 255, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, net.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        for(let i = -net.radius; i <= net.radius; i+=20) {
          ctx.moveTo(i, -Math.sqrt(net.radius*net.radius - i*i));
          ctx.lineTo(i, Math.sqrt(net.radius*net.radius - i*i));
          ctx.moveTo(-Math.sqrt(net.radius*net.radius - i*i), i);
          ctx.lineTo(Math.sqrt(net.radius*net.radius - i*i), i);
        }
        ctx.stroke();
        
        // Inner glow
        ctx.fillStyle = `rgba(100, 255, 255, ${alpha * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, net.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Bullets
      state.bullets.forEach(bullet => {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.fillStyle = '#00FFFF'; // Cyan bullet
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF'; // White core
        ctx.beginPath();
        ctx.arc(0, 0, bullet.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Cannon
      const cannonX = state.width / 2;
      const cannonY = state.height - 20;
      
      ctx.save();
      ctx.translate(cannonX, cannonY);
      
      // Cannon Base
      ctx.fillStyle = '#1a202c';
      ctx.beginPath();
      ctx.arc(0, 0, 50, Math.PI, 0);
      ctx.fill();
      
      // Base details
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 40, Math.PI, 0);
      ctx.stroke();
      
      // Barrel
      ctx.rotate(state.cannonAngle);
      
      // Barrel shadow/glow
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 10;
      
      // Main barrel
      const gradientBarrel = ctx.createLinearGradient(0, -20, 0, 20);
      gradientBarrel.addColorStop(0, '#4a5568');
      gradientBarrel.addColorStop(0.5, '#718096');
      gradientBarrel.addColorStop(1, '#2d3748');
      ctx.fillStyle = gradientBarrel;
      ctx.fillRect(0, -20, 80, 40);
      
      // Barrel tip
      ctx.fillStyle = '#cbd5e0';
      ctx.fillRect(70, -25, 15, 50);
      
      // Barrel accent
      ctx.fillStyle = '#00FFFF';
      ctx.fillRect(40, -5, 30, 10);
      
      ctx.restore();

      // Particles
      state.particles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.font = '900 32px "Arial Black", sans-serif';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText(p.text, 0, 0);
        ctx.fillText(p.text, 0, 0);
        
        // Add a little sparkle
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.fillText('✨', 20, -20);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#02183b] select-none font-sans">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full cursor-crosshair"
      />
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-gradient-to-r from-blue-900/80 to-blue-800/60 backdrop-blur-md border border-blue-400/30 rounded-full py-3 px-6 flex items-center gap-4 shadow-[0_0_20px_rgba(0,150,255,0.3)]">
          <div className="text-4xl drop-shadow-md">🪙</div>
          <div className="flex flex-col">
            <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Balance</span>
            <span className="text-yellow-400 text-3xl font-black tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              {score.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 pointer-events-none text-right">
        <div className="bg-gradient-to-l from-blue-900/80 to-blue-800/60 backdrop-blur-md border border-blue-400/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(0,150,255,0.3)]">
          <div className="text-blue-100 font-black text-lg mb-2 uppercase tracking-wider border-b border-blue-400/30 pb-2">How to Play</div>
          <ul className="text-blue-200 text-sm space-y-2 font-medium">
            <li className="flex items-center justify-end gap-2">
              <span>Aim with Mouse</span>
              <span className="bg-blue-950/50 p-1 rounded text-xs">🖱️</span>
            </li>
            <li className="flex items-center justify-end gap-2">
              <span>Click to Shoot</span>
              <span className="bg-blue-950/50 p-1 rounded text-xs text-cyan-400 font-bold">Cost: {BULLET_COST}</span>
            </li>
          </ul>
        </div>
      </div>
      
      {/* Bottom decorations (HTML overlay instead of canvas for crispness) */}
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none bg-gradient-to-t from-black/60 to-transparent"></div>
    </div>
  );
}
