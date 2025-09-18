'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';

type GameState = 'intro' | 'requestingPermission' | 'playing' | 'finished';

interface Crystal {
  id: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  shattered: boolean;
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
    shattered: false,
  }));
};

export function CrystalShatterGame() {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('intro');
  const [crystals, setCrystals] = useState<Crystal[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const drawCrystal = (ctx: CanvasRenderingContext2D, crystal: Crystal) => {
    if (crystal.shattered) return;
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
    if (gameState === 'playing') {
      animate();
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [draw, gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
  
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
    if (gameState !== 'requestingPermission') return;
    
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setGameState('playing');
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setGameState('intro'); // Go back to intro if denied
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };
    getCameraPermission();
  }, [gameState, toast]);

  const handleStartGameClick = () => {
    setGameState('requestingPermission');
  };

  useEffect(() => {
    if(gameState === 'playing' && gameContainerRef.current) {
        const { width, height } = gameContainerRef.current.getBoundingClientRect();
        if(canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
        setCrystals(generateCrystals(width, height));
        setParticles([]);
    }
  }, [gameState]);


  const handleShatter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let shatteredSomething = false;
    const newCrystals = crystals.map(crystal => {
      if (crystal.shattered) return crystal;

      const distance = Math.sqrt((x - crystal.x) ** 2 + (y - crystal.y) ** 2);
      if (distance < crystal.radius) {
        shatteredSomething = true;
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
        return { ...crystal, shattered: true };
      }
      return crystal;
    });

    if (shatteredSomething) {
      setCrystals(newCrystals);
      const remaining = newCrystals.filter(c => !c.shattered).length;
      if (remaining === 0) {
        setTimeout(() => setGameState('finished'), 2000); // Wait for particles to fade
      }
    }
  };

  const handleReturnToChat = () => {
    setGameState('intro');
    setHasCameraPermission(null);
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
            <p className="text-sm text-muted-foreground">Please allow camera access in your browser.</p>
          </div>
        );
      
      case 'playing':
        if (hasCameraPermission === false) {
           return (
            <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
                <Alert variant="destructive" className="w-auto text-left mt-4">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                      Camera access was denied. Please enable it in your browser settings and try again.
                    </AlertDescription>
                </Alert>
                <Button onClick={handleReturnToChat}>Return to Chat</Button>
            </div>
           )
        }
        return (
          <div ref={gameContainerRef} className="relative w-full aspect-[9/16] max-h-[80vh] bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} onClick={handleShatter} className="absolute inset-0 w-full h-full" />
          </div>
        );

      case 'finished':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-10 min-h-[250px] animate-in fade-in">
            <Sparkles className="h-10 w-10 text-primary" />
            <h3 className="text-xl font-semibold">You cleared it all!</h3>
            <p className="text-muted-foreground">Take a deep breath and feel the space you've created.</p>
            <Button onClick={handleReturnToChat}>Return to Chat</Button>
          </div>
        );

      case 'intro':
      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
            <h2 className="text-xl font-bold">Crystal Shatter!</h2>
            <p className="text-muted-foreground">This experience uses your camera to overlay virtual, breakable objects onto your environment. Tap the glowing crystals to release the stress they hold!</p>
            <Button onClick={handleStartGameClick}>
                <Camera className="mr-2 h-4 w-4" />
                Start Game
              </Button>
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
