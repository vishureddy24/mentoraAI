'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, Sparkles, Wind } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { BreathingExercise } from './breathing-exercise';

type GameState = 'idle' | 'requestingPermission' | 'ready' | 'gameStarted' | 'cooldown' | 'gameEnded';

const FRUIT_TYPES = {
  watermelon: { color: '#27a040', borderColor: '#084f18' }, // green
  apple: { color: '#d92121', borderColor: '#8f0e0e' },      // red
  orange: { color: '#f5a623', borderColor: '#b57b1b' },    // orange
};
type FruitType = keyof typeof FRUIT_TYPES;

interface Fruit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: FruitType;
  isSliced: boolean;
  sliceAngle: number;
  pieces: { x: number; y: number; vx: number; vy: number }[];
}

interface Slice {
  id: number;
  points: { x: number, y: number }[];
  life: number;
}

export function FruitSlicerGame() {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [score, setScore] = useState(0);
  const [stressLevel, setStressLevel] = useState(100);
  const [gameTimer, setGameTimer] = useState(90);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();

  const isSlicing = useRef(false);
  const lastSlicePoint = useRef<{x: number, y: number} | null>(null);

  // Stop all video streams
  const cleanupCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestCamera = useCallback(async () => {
    if (hasCameraPermission) return;
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
    setGameState('gameStarted');
    setScore(0);
    setStressLevel(100);
    setFruits([]);
    setGameTimer(90);
  };
  
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Update and draw fruits
    setFruits(prevFruits => {
      const updatedFruits = prevFruits.map(fruit => {
        if (fruit.isSliced) {
          fruit.pieces.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4; // Gravity on pieces
          });
        } else {
          fruit.x += fruit.vx;
          fruit.y += fruit.vy;
          fruit.vy += 0.2; // Gravity on whole fruit
        }
        return fruit;
      }).filter(fruit => fruit.y < canvas.height + 100); // Remove fruits that are off-screen
      
      // Draw
      updatedFruits.forEach(fruit => drawFruit(ctx, fruit));
      return updatedFruits;
    });

    // Update and draw slices
    setSlices(prevSlices => {
        const updatedSlices = prevSlices.map(slice => ({ ...slice, life: slice.life - 1 })).filter(slice => slice.life > 0);
        updatedSlices.forEach(slice => drawSlice(ctx, slice));
        return updatedSlices;
    });
  
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, []);
  
  useEffect(() => {
    if (gameState === 'gameStarted') {
      const { width } = gameContainerRef.current!.getBoundingClientRect();
      
      const fruitInterval = setInterval(() => {
        setFruits(prev => [
          ...prev,
          createFruit(width)
        ]);
      }, 1000); // Spawn a new fruit every second

      const timerInterval = setInterval(() => {
        setGameTimer(prev => {
          if (prev <= 1) {
            clearInterval(fruitInterval);
            clearInterval(timerInterval);
            setGameState('cooldown');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      animationFrameId.current = requestAnimationFrame(gameLoop);
  
      return () => {
        clearInterval(fruitInterval);
        clearInterval(timerInterval);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      };
    }
  }, [gameState, gameLoop]);

  const createFruit = (canvasWidth: number): Fruit => {
    const fruitTypes = Object.keys(FRUIT_TYPES) as FruitType[];
    const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    return {
      id: Date.now() + Math.random(),
      x: Math.random() * canvasWidth,
      y: canvasRef.current!.height + 50,
      vx: (Math.random() - 0.5) * 8,
      vy: - (Math.random() * 5 + 10), // Shoot upwards
      radius: Math.random() * 10 + 20,
      type: type,
      isSliced: false,
      sliceAngle: 0,
      pieces: [],
    };
  };

  const drawFruit = (ctx: CanvasRenderingContext2D, fruit: Fruit) => {
    const { color, borderColor } = FRUIT_TYPES[fruit.type];
    
    if (fruit.isSliced) {
        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.sliceAngle);
        // Draw two half-circles
        fruit.pieces.forEach(p => {
          ctx.fillStyle = color;
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, fruit.radius, 0, Math.PI);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
    } else {
      ctx.fillStyle = color;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawSlice = (ctx: CanvasRenderingContext2D, slice: Slice) => {
    if (slice.points.length < 2) return;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (slice.life / 30)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(slice.points[0].x, slice.points[0].y);
    for (let i = 1; i < slice.points.length; i++) {
        ctx.lineTo(slice.points[i].x, slice.points[i].y);
    }
    ctx.stroke();
  };

  const handleSlice = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'gameStarted' || !isSlicing.current) return;
    
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const currentPoint = 'touches' in e ? 
        { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top } : 
        { x: e.clientX - rect.left, y: e.clientY - rect.top };

    setSlices(prev => {
        const currentSlice = prev[prev.length - 1];
        if (currentSlice) {
            currentSlice.points.push(currentPoint);
        }
        return [...prev];
    });

    if (lastSlicePoint.current) {
        setFruits(prevFruits => prevFruits.map(fruit => {
            if (fruit.isSliced) return fruit;
            
            const dist = Math.hypot(currentPoint.x - fruit.x, currentPoint.y - fruit.y);

            if (dist < fruit.radius) {
              setScore(s => s + 10);
              setStressLevel(sl => Math.max(0, sl - 5));
              const angle = Math.atan2(currentPoint.y - lastSlicePoint.current!.y, currentPoint.x - lastSlicePoint.current!.x);
              return { 
                ...fruit, 
                isSliced: true,
                sliceAngle: angle,
                pieces: [
                  { x: -fruit.radius / 2, y: 0, vx: -2, vy: -2 },
                  { x: fruit.radius / 2, y: 0, vx: 2, vy: -2 },
                ]
              };
            }
            return fruit;
        }));
    }
    lastSlicePoint.current = currentPoint;
  };
  
  const startSlicing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      isSlicing.current = true;
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const point = 'touches' in e ? 
        { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top } : 
        { x: e.clientX - rect.left, y: e.clientY - rect.top };
      lastSlicePoint.current = point;
      setSlices(prev => [...prev, {id: Date.now(), points: [point], life: 30}]);
  };

  const endSlicing = () => {
      isSlicing.current = false;
      lastSlicePoint.current = null;
  };

  const handleReturnToChat = () => {
    cleanupCamera();
    setGameState('idle');
    setHasCameraPermission(null);
  };
  
  useEffect(() => {
    if (gameState === 'cooldown') {
      const timer = setTimeout(() => {
        setGameState('gameEnded');
      }, 10000); // Cooldown for 10 seconds
      return () => clearTimeout(timer);
    }
  }, [gameState]);


  const renderContent = () => {
    switch (gameState) {
      case 'idle':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
            <h2 className="text-xl font-bold">Fruit Slicer!</h2>
            <p className="text-muted-foreground">This experience uses your camera to create an interactive space. Swipe to slice the fruit and release your stress!</p>
            <Button onClick={requestCamera}>
              <Camera className="mr-2 h-4 w-4" />
              Enable Camera
            </Button>
          </div>
        );
      case 'requestingPermission':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
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
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
            <h2 className="text-xl font-bold">Ready to Slice?</h2>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black max-w-sm">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                 <Button onClick={startGame} size="lg">Start Game</Button>
              </div>
            </div>
          </div>
        );
      case 'gameStarted':
        return (
          <div ref={gameContainerRef} className="relative w-full aspect-video max-h-[80vh] bg-gray-800 rounded-lg overflow-hidden cursor-crosshair">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-30" autoPlay muted playsInline />
            <canvas 
              ref={canvasRef}
              width={gameContainerRef.current?.clientWidth || 640}
              height={gameContainerRef.current?.clientHeight || 360}
              className="absolute inset-0 w-full h-full"
              onMouseDown={startSlicing}
              onMouseUp={endSlicing}
              onMouseLeave={endSlicing}
              onMouseMove={handleSlice}
              onTouchStart={startSlicing}
              onTouchEnd={endSlicing}
              onTouchMove={handleSlice}
            />
            <div className="absolute top-2 left-2 right-2 text-white bg-black/50 p-2 rounded-lg">
                <div className='flex justify-between items-center text-lg font-bold'>
                    <p>Time: {gameTimer}</p>
                    <p>Score: {score}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-center mb-1">Stress Level</p>
                  <Progress value={stressLevel} className="h-2" />
                </div>
            </div>
          </div>
        );
      case 'cooldown':
        return (
          <div className="w-full max-w-md">
            <p className="text-center font-semibold mb-2">Great job! Time to cool down.</p>
            <BreathingExercise />
          </div>
        );
      case 'gameEnded':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-10 min-h-[250px] animate-in fade-in">
            <Sparkles className="h-10 w-10 text-primary" />
            <h3 className="text-xl font-semibold">You destroyed your stress with a score of {score}!</h3>
            <p className="text-muted-foreground">You reduced your stress level by {100 - stressLevel}%. Awesome work.</p>
            <p className="mt-4">Take a deep breath and feel the space you've created.</p>
            <Button onClick={handleReturnToChat} className="mt-4">Return to Chat</Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md bg-background/50 border-accent/20">
      <CardContent className="p-2 flex justify-center items-center">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
