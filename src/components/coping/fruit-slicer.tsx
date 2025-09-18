'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, Sparkles, Bomb, Apple } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'idle' | 'requestingPermission' | 'ready' | 'playing' | 'gameOver';

const FRUIT_TYPES = {
  apple: { color: '#d92121', icon: Apple },      // red
  orange: { color: '#f5a623', icon: Apple },    // orange
  watermelon: { color: '#27a040', icon: Apple }, // green
};
type FruitType = keyof typeof FRUIT_TYPES;

interface GameObject {
  id: number;
  type: 'fruit' | 'bomb';
  fruitType?: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isSliced: boolean;
}

export function FruitSlicerGame() {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
  const [score, setScore] = useState(0);
  const [gameTimer, setGameTimer] = useState(45);
  const animationFrameId = useRef<number>();
  const gameContainerRef = useRef<HTMLDivElement>(null);


  const cleanupCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestCamera = useCallback(async () => {
    if (hasCameraPermission) {
        setGameState('ready');
        return;
    };
    setGameState('requestingPermission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise(resolve => videoRef.current!.onloadedmetadata = resolve);
      }
      setHasCameraPermission(true);
      setGameState('ready');
    } catch (error) {
      console.error("Camera permission denied:", error);
      setHasCameraPermission(false);
      setGameState('idle');
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions to play.',
      });
    }
  }, [hasCameraPermission, toast]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setGameObjects([]);
    setGameTimer(45);
  };
  
  const createGameObject = useCallback((canvasWidth: number, canvasHeight: number): GameObject => {
    const isBomb = Math.random() < 0.2; // 20% chance of being a bomb
    const fruitTypes = Object.keys(FRUIT_TYPES) as FruitType[];
    const fruitType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    return {
      id: Date.now() + Math.random(),
      type: isBomb ? 'bomb' : 'fruit',
      fruitType: isBomb ? undefined : fruitType,
      x: Math.random() * canvasWidth * 0.8 + canvasWidth * 0.1, // Spawn away from edges
      y: canvasHeight + 50,
      vx: (Math.random() - 0.5) * 6,
      vy: -(Math.random() * 8 + 12), // Upward velocity
      radius: isBomb ? 20 : Math.random() * 10 + 20,
      isSliced: false,
    };
  }, []);

  const drawGameObject = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
    ctx.beginPath();
    if (obj.type === 'bomb') {
        ctx.fillStyle = '#333';
        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffdd00';
        ctx.fillRect(obj.x-3, obj.y-obj.radius-5, 6, 10);
    } else {
        if(obj.isSliced){
            const { color } = FRUIT_TYPES[obj.fruitType!];
            ctx.fillStyle = color;
            // Draw two halves
            ctx.beginPath();
            ctx.arc(obj.x - 5, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(obj.x + 5, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const { color } = FRUIT_TYPES[obj.fruitType!];
            ctx.fillStyle = color;
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
  };

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    setGameObjects(prevObjects => {
        const updatedObjects = prevObjects.map(obj => {
            const newObj = { ...obj };
            newObj.x += newObj.vx;
            newObj.y += newObj.vy;
            newObj.vy += 0.2; // Gravity
            return newObj;
        }).filter(obj => obj.y < canvas.height + 100);

        updatedObjects.forEach(obj => drawGameObject(ctx, obj));
        return updatedObjects;
    });
  
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [drawGameObject]);
  
  useEffect(() => {
    if (gameState === 'playing') {
      const canvas = canvasRef.current;
      if(!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      
      const objectInterval = setInterval(() => {
        setGameObjects(prev => [...prev, createGameObject(width, height)]);
      }, 800); // Spawn a new object every 800ms

      const timerInterval = setInterval(() => {
        setGameTimer(prev => {
          if (prev <= 1) {
            clearInterval(objectInterval);
            clearInterval(timerInterval);
            setGameState('gameOver');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      animationFrameId.current = requestAnimationFrame(gameLoop);
  
      return () => {
        clearInterval(objectInterval);
        clearInterval(timerInterval);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      };
    }
  }, [gameState, gameLoop, createGameObject]);


  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;
    setGameObjects(prev => prev.map(obj => {
        if (!obj.isSliced && !hit) {
            const dist = Math.hypot(clickX - obj.x, clickY - obj.y);
            if (dist < obj.radius) {
                hit = true;
                if (obj.type === 'bomb') {
                    setGameState('gameOver');
                } else {
                    setScore(s => s + 10);
                    return { ...obj, isSliced: true, vy: obj.vy + 2 }; // Make sliced pieces fall faster
                }
            }
        }
        return obj;
    }).filter(obj => !obj.isSliced || obj.y < canvas.height + 50)); // remove sliced items once offscreen
  };

  const resetGame = () => {
    cleanupCamera();
    setGameState('idle');
    setHasCameraPermission(null);
  };
  
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && gameContainerRef.current) {
        canvasRef.current.width = gameContainerRef.current.clientWidth;
        canvasRef.current.height = gameContainerRef.current.clientHeight;
      }
    };
    // Only run resize on the client
    if (typeof window !== 'undefined') {
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Initial size
        return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [gameState]);
  
  const renderContent = () => {
    switch (gameState) {
      case 'idle':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[300px]">
            <h2 className="text-2xl font-bold">Fruit Frenzy! 🥑</h2>
            <p className="text-muted-foreground">This experience uses your camera. Tap the fruit as fast as you can to slice it! Avoid tapping the bombs.</p>
            <Button onClick={requestCamera}>
              <Camera className="mr-2 h-4 w-4" />
              Enable Camera
            </Button>
          </div>
        );
      case 'requestingPermission':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Requesting camera access...</p>
            {hasCameraPermission === false && <Alert variant="destructive" className="mt-4">
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>Please enable camera permissions in your browser settings to play.</AlertDescription>
            </Alert>}
          </div>
        );
      case 'ready':
         return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[300px]">
            <h2 className="text-2xl font-bold">Ready?</h2>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black max-w-sm">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                 <Button onClick={startGame} size="lg">Start Game</Button>
              </div>
            </div>
             <Button variant="link" onClick={resetGame}>Back to Menu</Button>
          </div>
        );
      case 'playing':
        return (
          <div className="relative w-full aspect-video max-h-[80vh] bg-gray-800 rounded-lg overflow-hidden cursor-pointer">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-30" autoPlay muted playsInline />
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              onClick={handleCanvasClick}
            />
            <div className="absolute top-2 left-2 right-2 text-white bg-black/50 p-2 rounded-lg">
                <div className='flex justify-between items-center text-lg font-bold'>
                    <p>Time: {gameTimer}</p>
                    <p>Score: {score}</p>
                </div>
            </div>
          </div>
        );
      case 'gameOver':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-10 min-h-[300px] animate-in fade-in">
            {score > 0 ? (
                <Sparkles className="h-10 w-10 text-primary" />
            ) : (
                <Bomb className="h-10 w-10 text-destructive" />
            )}
            <h3 className="text-2xl font-semibold">Game Over!</h3>
            <p className="text-xl">Your Score: {score}</p>
            <p className="text-muted-foreground mt-2">Great job focusing your energy! Hope that helped.</p>
            <div className='flex gap-4 mt-4'>
                <Button onClick={startGame}>Play Again</Button>
                <Button onClick={resetGame} variant="secondary">Return to Menu</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl bg-background/50 border-accent/20">
      <CardContent className="p-2 flex justify-center items-center" ref={gameContainerRef}>
        {renderContent()}
      </CardContent>
    </Card>
  );
}

    