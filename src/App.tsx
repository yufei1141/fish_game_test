import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { Anchor, Play, RotateCcw, Trophy } from 'lucide-react';

type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [finalScore, setFinalScore] = useState(0);

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameState('GAMEOVER');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-100">
      {gameState === 'MENU' && (
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center space-y-8">
          <div className="w-24 h-24 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 mb-2">
            <Anchor size={48} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-sky-400 to-blue-600 mb-2">
              Ocean Hunter
            </h1>
            <p className="text-slate-400">Catch fish, earn coins, upgrade your cannon!</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 w-full text-left text-sm text-slate-300 space-y-2">
            <p>🎯 Click to shoot a net</p>
            <p>💰 Shooting costs coins based on cannon level</p>
            <p>⭐ Higher level cannons have better catch rates</p>
            <p>💀 Game over when you run out of coins</p>
          </div>

          <button
            onClick={() => setGameState('PLAYING')}
            className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
          >
            <Play fill="currentColor" size={20} />
            START GAME
          </button>
        </div>
      )}

      {gameState === 'PLAYING' && (
        <div className="w-full flex flex-col items-center space-y-4">
          <GameCanvas onGameOver={handleGameOver} />
          <p className="text-slate-500 text-sm">Tip: Upgrade your cannon to catch bigger fish!</p>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center space-y-8">
          <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 mb-2">
            <Trophy size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white mb-2">Out of Coins!</h2>
            <p className="text-slate-400">The ocean has claimed your wallet.</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 w-full">
            <p className="text-sm text-slate-400 uppercase tracking-wider font-bold mb-1">Final Score</p>
            <p className="text-5xl font-black text-amber-400">{finalScore}</p>
          </div>

          <button
            onClick={() => setGameState('PLAYING')}
            className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
          >
            <RotateCcw size={20} />
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
