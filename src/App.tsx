import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';

type Point = { x: number; y: number };

const GRID_SIZE = 25;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const INITIAL_SNAKE: Point[] = [{ x: 12, y: 12 }, { x: 12, y: 13 }, { x: 12, y: 14 }];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 };

const TRACKS = [
  { id: 1, title: 'SYS.OP_DIRGE.wav', url: 'https://actions.google.com/sounds/v1/science_fiction/sci_fi_drone.ogg' },
  { id: 2, title: 'NEON_PULSE_SEQ.mp3', url: 'https://actions.google.com/sounds/v1/science_fiction/alien_breath.ogg' },
  { id: 3, title: 'GLITCH_CORE_V2.flac', url: 'https://actions.google.com/sounds/v1/science_fiction/spaceship_engine.ogg' },
];

const randomFoodPosition = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
    if (!snake.some(s => s.x === newFood.x && s.y === newFood.y)) break;
  }
  return newFood;
};

export default function App() {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 8, y: 8 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const directionRef = useRef(direction);

  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => { directionRef.current = direction; }, [direction]);

  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
      const mem = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase();
      const msg = Math.random() > 0.85 ? `ERR_CORRUPTION_AT_0x${mem}` : `SYS_OP_0x${hex}_OK`;
      setLogs(prev => [...prev.slice(-19), msg]);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIdx]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const nextTrack = () => setCurrentTrackIdx((prev) => (prev + 1) % TRACKS.length);
  const toggleMute = () => setIsMuted(!isMuted);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE); setDirection(INITIAL_DIRECTION); setScore(0);
    setGameOver(false); setFood(randomFoodPosition(INITIAL_SNAKE)); setIsPaused(false);
  };

  const gameLoop = useCallback(() => {
    if (gameOver || isPaused) return;
    setSnake((prev) => {
      const head = prev[0];
      const newHead = { x: head.x + directionRef.current.x, y: head.y + directionRef.current.y };

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE || prev.some(s => s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true); return prev;
      }

      const newSnake = [newHead, ...prev];
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 16); setFood(randomFoodPosition(newSnake));
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [food, gameOver, isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(e.key)) e.preventDefault();
      const { x, y } = directionRef.current;
      switch (e.key.toLowerCase()) {
        case 'arrowup': case 'w': if (y === 0) setDirection({ x: 0, y: -1 }); break;
        case 'arrowdown': case 's': if (y === 0) setDirection({ x: 0, y: 1 }); break;
        case 'arrowleft': case 'a': if (x === 0) setDirection({ x: -1, y: 0 }); break;
        case 'arrowright': case 'd': if (x === 0) setDirection({ x: 1, y: 0 }); break;
        case ' ': setIsPaused(p => !p); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(gameLoop, 80);
    return () => clearInterval(interval);
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    ctx.fillStyle = Math.random() > 0.1 ? '#ff00ff' : '#ffffff';
    ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#ffff00' : (index % 2 === 0 ? '#00ffff' : '#00cccc');
      const offsetX = Math.random() > 0.95 ? (Math.random() * 4 - 2) : 0;
      ctx.fillRect(segment.x * CELL_SIZE + offsetX, segment.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    });
  }, [snake, food]);

  return (
    <div className="min-h-screen bg-black text-[#00ffff] font-mono p-4 flex flex-col overflow-hidden relative selection:bg-[#ff00ff] selection:text-white">
      <div className="static-noise"></div>
      <div className="scanlines"></div>
      <div className="crt-flicker"></div>
      <div className="screen-tear"></div>
      
      <audio ref={audioRef} src={TRACKS[currentTrackIdx].url} onEnded={nextTrack} loop={false} />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-[#ff00ff] pb-2 mb-4 z-10">
        <div>
          <h1 className="glitch-text text-4xl md:text-6xl font-bold" data-text="NEON_SNAKE_OS.exe">NEON_SNAKE_OS.exe</h1>
          <div className="text-[#ffff00] text-sm md:text-base mt-1 animate-pulse tracking-widest">STATUS: CRITICAL_FAILURE_IMMINENT</div>
        </div>
        <div className="text-left md:text-right mt-4 md:mt-0">
          <div className="text-[#ff00ff] text-xl md:text-2xl tracking-widest">MEM_ALLOC:</div>
          <div className="text-3xl md:text-4xl font-bold text-white">{score.toString().padStart(6, '0')} <span className="text-[#00ffff] text-xl">B</span></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 z-10 min-h-0 max-w-7xl mx-auto w-full">
        
        <aside className="hidden lg:flex flex-col w-72 panel-border p-4 bg-black/80">
          <h2 className="text-[#ff00ff] border-b-2 border-[#00ffff] pb-2 mb-2 text-xl tracking-widest">SYS_LOGS</h2>
          <div className="flex-1 overflow-hidden text-sm opacity-80 flex flex-col justify-end space-y-1 font-bold">
            {logs.map((log, i) => (
              <div key={i} className={log.includes('ERR') ? 'text-[#ffff00] bg-red-900/20' : 'text-[#00ffff]'}>
                &gt; {log}
              </div>
            ))}
          </div>
        </aside>

        <section className="flex-1 flex flex-col items-center justify-center panel-border p-2 md:p-4 bg-black/90 relative group">
           <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="border-2 border-[#333] shadow-[0_0_30px_rgba(0,255,255,0.15)] max-w-full h-auto" />
           
           {gameOver && (
             <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center z-20 border-4 border-[#ff00ff]">
               <h2 className="glitch-text text-5xl md:text-7xl text-[#ff00ff] mb-8 text-center" data-text="FATAL_EXCEPTION">FATAL_EXCEPTION</h2>
               <div className="text-[#ffff00] mb-8 text-center animate-pulse text-xl">MEMORY_CORRUPTION_DETECTED</div>
               <button onClick={resetGame} className="px-8 py-4 border-4 border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-black font-bold text-2xl uppercase transition-all tracking-widest cursor-pointer">
                 [ EXECUTE_REBOOT ]
               </button>
             </div>
           )}

           {isPaused && !gameOver && (
             <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
               <div className="text-[#ffff00] text-4xl uppercase tracking-widest animate-pulse border-y-4 border-[#ffff00] py-4 w-full text-center bg-black/50">
                 PROCESS_HALTED
               </div>
             </div>
           )}
        </section>

        <aside className="w-full lg:w-80 flex flex-col gap-6">
          <div className="panel-border p-4 bg-black/80 flex-1 flex flex-col">
            <h2 className="text-[#ffff00] border-b-2 border-[#ff00ff] pb-2 mb-4 text-xl tracking-widest">AUDIO_DECODER</h2>
            
            <div className="flex-1 flex flex-col justify-center">
               <div className="text-sm text-[#ff00ff] mb-2 tracking-widest">STREAMING_DATA:</div>
               <div className="text-2xl font-bold truncate mb-6 text-black bg-[#ff00ff] p-2 uppercase">
                 {TRACKS[currentTrackIdx].title}
               </div>

               <div className="flex items-end h-20 gap-1 mb-8 opacity-80 border-b border-[#00ffff] pb-1">
                 {[...Array(20)].map((_, i) => (
                   <div key={i} className={`flex-1 ${isPlaying ? 'animate-pulse' : ''}`} style={{ 
                     height: isPlaying ? `${Math.random() * 100}%` : '10%', 
                     animationDuration: `${Math.random() * 0.5 + 0.1}s`,
                     backgroundColor: i % 3 === 0 ? '#ff00ff' : '#00ffff'
                   }}></div>
                 ))}
               </div>

               <div className="grid grid-cols-3 gap-4">
                 <button onClick={togglePlay} className="border-2 border-[#00ffff] p-4 flex justify-center hover:bg-[#00ffff] hover:text-black transition-colors cursor-pointer">
                   {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                 </button>
                 <button onClick={nextTrack} className="border-2 border-[#00ffff] p-4 flex justify-center hover:bg-[#00ffff] hover:text-black transition-colors cursor-pointer">
                   <SkipForward size={28} />
                 </button>
                 <button onClick={toggleMute} className={`border-2 p-4 flex justify-center transition-colors cursor-pointer ${isMuted ? 'border-[#ff00ff] text-[#ff00ff] hover:bg-[#ff00ff] hover:text-black' : 'border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-black'}`}>
                   {isMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
                 </button>
               </div>
            </div>
          </div>

          <div className="panel-border p-4 bg-black/80 text-base">
            <h2 className="text-[#00ffff] border-b-2 border-[#00ffff] pb-2 mb-4 text-xl tracking-widest">MANUAL_OVERRIDE</h2>
            <ul className="space-y-3 text-[#ff00ff] tracking-wider">
              <li className="flex justify-between border-b border-gray-800 pb-2"><span className="text-white font-bold">W/A/S/D</span> <span>VECTOR_SHIFT</span></li>
              <li className="flex justify-between border-b border-gray-800 pb-2"><span className="text-white font-bold">ARROWS</span> <span>VECTOR_SHIFT</span></li>
              <li className="flex justify-between"><span className="text-white font-bold">SPACE</span> <span>HALT_PROCESS</span></li>
            </ul>
          </div>
        </aside>

      </main>
    </div>
  );
}
