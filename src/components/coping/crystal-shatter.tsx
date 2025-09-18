'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { BreathingExercise } from './breathing-exercise';

type GameState = 'idle' | 'requestingPermission' | 'ready' | 'gameStarted' | 'cooldown' | 'gameEnded';

interface Crystal {
  id: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
}

const generateCrystals = (width: number, height: number): Crystal[] => {
  const crystalCount = 7;
  return Array.from({ length: crystalCount }, (_, i) => ({
    id: i,
    x: Math.random() * (width * 0.8) + width * 0.1,
    y: Math.random() * (height * 0.8) + height * 0.1,
    radius: Math.random() * 15 + 20, // 20 to 35
    opacity: 1,
  }));
};

export function CrystalShatterGame() {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [crystals, setCrystals] = useState<Crystal[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [stressLevel, setStressLevel] = useState(100);
  const [timer, setTimer] = useState(90);
  
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const drawCrystal = (ctx: CanvasRenderingContext2D, crystal: Crystal) => {
    ctx.save();
    ctx.globalAlpha = crystal.opacity;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(150, 150, 255, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    
    const gradient = ctx.createRadialGradient(crystal.x, crystal.y, 0, crystal.x, crystal.y, crystal.radius);
    gradient.addColorStop(0, 'rgba(200, 200, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(100, 100, 220, 0.6)');
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.arc(crystal.x, crystal.y, crystal.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.opacity;
    ctx.fillStyle = 'rgba(210, 210, 255, 0.9)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'white';
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    crystals.forEach(crystal => drawCrystal(ctx, crystal));
    particles.forEach(particle => drawParticle(ctx, particle));
  }, [crystals, particles]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      draw();
      animationFrameId = requestAnimationFrame(animate);
    };
    if (gameState === 'gameStarted') {
      animate();
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw, gameState]);
  
  useEffect(() => {
    if (gameState !== 'gameStarted') return;
  
    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticles = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1, // gravity
            opacity: p.opacity - 0.015,
          }))
          .filter(p => p.opacity > 0);
        return newParticles;
      });
    }, 1000 / 60);
  
    return () => clearInterval(interval);
  }, [gameState]);


  useEffect(() => {
    const getCameraPermission = async () => {
      if (gameState !== 'requestingPermission' || hasCameraPermission !== null) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setGameState('ready');
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setGameState('idle');
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };
    getCameraPermission();
  }, [gameState, toast, hasCameraPermission]);

  useEffect(() => {
    if (gameState === 'gameStarted' && (timer <= 0 || stressLevel <= 0)) {
        setTimeout(() => setGameState('cooldown'), 1000);
    }
    
    if (gameState === 'gameStarted' && timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    }
  }, [gameState, timer, stressLevel]);

  const handleStartGame = () => {
    const canvas = canvasRef.current;
    if (canvas && gameContainerRef.current) {
        const { width, height } = gameContainerRef.current.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;
        setCrystals(generateCrystals(width, height));
    }
    setStressLevel(100);
    setParticles([]);
    setTimer(90);
    setGameState('gameStarted');
  };

  const handleShatter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'gameStarted') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let crystalShattered = false;
    const remainingCrystals: Crystal[] = [];

    crystals.forEach(crystal => {
      const distance = Math.sqrt((x - crystal.x) ** 2 + (y - crystal.y) ** 2);
      if (distance < crystal.radius) {
        crystalShattered = true;
        // Create particles
        const newParticles = Array.from({ length: 30 }, () => ({
          x: crystal.x,
          y: crystal.y,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          opacity: 1,
          size: Math.random() * 2 + 1,
        }));
        setParticles(prev => [...prev, ...newParticles]);
        setStressLevel(prev => Math.max(0, prev - (100 / 7)));
      } else {
        remainingCrystals.push(crystal);
      }
    });

    if (crystalShattered) {
      setCrystals(remainingCrystals);
      if (remainingCrystals.length === 0) {
        setTimeout(() => setGameState('cooldown'), 1000);
      }
    }
  };

  const handleReturnToChat = () => {
    setGameState('idle');
    setHasCameraPermission(null);
    setStressLevel(100);
    setTimer(90);
    if(videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
  };

  const renderContent = () => {
    switch (gameState) {
      case 'requestingPermission':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Requesting camera access...</p>
          </div>
        );
      
      case 'gameStarted':
        return (
          <div ref={gameContainerRef} className="relative w-full aspect-[9/16] max-h-[80vh] bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} onClick={handleShatter} className="absolute inset-0 w-full h-full" />
            <div className="absolute top-4 left-4 right-4 text-white p-2 rounded-lg bg-black/50 space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                    <p>Stress Meter</p>
                    <p>Time Left: {timer}s</p>
                </div>
                <Progress value={100 - stressLevel} className="h-2 [&>div]:bg-green-400" />
            </div>
          </div>
        );

      case 'cooldown':
        return (
            <div className="w-full max-w-md p-4 animate-in fade-in">
                <BreathingExercise />
                 <Button onClick={() => setGameState('gameEnded')} className="w-full mt-4">Continue</Button>
            </div>
        )

      case 'gameEnded':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-10 min-h-[250px] animate-in fade-in">
            <Sparkles className="h-10 w-10 text-primary" />
            <h3 className="text-xl font-semibold">You cleared it all.</h3>
            <p className="text-muted-foreground">Take a deep breath and feel the space you've created.</p>
            <p className="font-bold text-lg">You reduced your stress by {Math.round(100 - stressLevel)}%!</p>
            <Button onClick={handleReturnToChat}>Return to Chat</Button>
          </div>
        );

      case 'ready':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
            <h2 className="text-xl font-bold">Crystal Shatter</h2>
            <p className="text-muted-foreground">This experience uses your camera to overlay virtual, breakable objects onto your environment. Tap to smash them and release stress.</p>
            <Button onClick={handleStartGame}>
              Start Game
            </Button>
          </div>
        )

      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
            <h2 className="text-xl font-bold">Crystal Shatter</h2>
            <p className="text-muted-foreground">This experience uses your camera to overlay virtual, breakable objects onto your environment. Tap to smash them and release stress.</p>
            <Button onClick={() => setGameState('requestingPermission')} disabled={gameState === 'requestingPermission'}>
                <Camera className="mr-2 h-4 w-4" />
                Enable Camera
              </Button>
            {hasCameraPermission === false && (
                <Alert variant="destructive" className="w-auto text-left mt-4">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Please allow camera access to use this feature.
                    </AlertDescription>
                </Alert>
            )}
             <p className="text-xs text-muted-foreground mt-2">Camera access is required to play.</p>
          </div>
        );
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
