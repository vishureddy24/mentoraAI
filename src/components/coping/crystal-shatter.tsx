'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Sparkles, Wind, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type GameState = 'idle' | 'requestingPermission' | 'gameStarted' | 'gameEnded';
type Crystal = {
  id: number;
  top: string;
  left: string;
  size: string;
  shattered: boolean;
};

const CrystalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <defs>
      <radialGradient id="crystal-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.8)" />
        <stop offset="100%" stopColor="rgba(192, 192, 255, 0.5)" />
      </radialGradient>
      <filter id="crystal-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      filter="url(#crystal-glow)"
      fill="url(#crystal-gradient)"
      style={{ stroke: 'rgba(255,255,255,0.4)' }}
    />
    {/* Cracks */}
    <line x1="12" y1="2" x2="8" y2="10" stroke="rgba(0,0,0,0.2)" />
    <line x1="12" y1="12" x2="15" y2="14" stroke="rgba(0,0,0,0.2)" />
    <line x1="6" y1="9" x2="18" y2="9" stroke="rgba(0,0,0,0.1)" />
  </svg>
);

const generateCrystals = (): Crystal[] => {
  const crystalCount = Math.floor(Math.random() * 3) + 5; // 5-7 crystals
  return Array.from({ length: crystalCount }, (_, i) => ({
    id: i,
    top: `${Math.random() * 80 + 10}%`, // 10% to 90%
    left: `${Math.random() * 80 + 10}%`,
    size: `${Math.random() * 30 + 40}px`, // 40px to 70px
    shattered: false,
  }));
};

export function CrystalShatterGame() {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [crystals, setCrystals] = useState<Crystal[]>([]);

  useEffect(() => {
    if (gameState === 'requestingPermission') {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setGameState('idle');
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
    }
  }, [gameState, toast]);

  const handleStartGame = () => {
    setCrystals(generateCrystals());
    setGameState('gameStarted');
  };

  const handleShatter = (crystalId: number) => {
    // I can't generate sounds, but this is where you would play a chime.
    setCrystals(prevCrystals => {
      const newCrystals = prevCrystals.map(c =>
        c.id === crystalId ? { ...c, shattered: true } : c
      );
      if (newCrystals.every(c => c.shattered)) {
        setTimeout(() => setGameState('gameEnded'), 1000); // Wait for animation
      }
      return newCrystals;
    });
  };

  const handleReturnToChat = () => {
     setGameState('idle');
     setHasCameraPermission(null);
     // In a real app, this would call a function passed via props to unmount the component
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
           <div className="relative w-full aspect-[9/16] max-h-[80vh] bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <div className="absolute inset-0">
              {crystals.map(crystal => (
                <div
                  key={crystal.id}
                  className={cn(
                    'absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out cursor-pointer',
                    crystal.shattered ? 'opacity-0 scale-150' : 'opacity-100 scale-100 animate-in fade-in zoom-in'
                  )}
                  style={{ top: crystal.top, left: crystal.left, width: crystal.size, height: crystal.size }}
                  onClick={() => handleShatter(crystal.id)}
                >
                  <CrystalIcon className="w-full h-full drop-shadow-[0_0_8px_rgba(150,150,255,0.9)]" />
                </div>
              ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/50 text-white p-2 rounded-md text-xs">
              <p>Tap the glowing crystals to shatter them!</p>
            </div>
          </div>
        )

      case 'gameEnded':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-10 h-64 animate-in fade-in">
            <Sparkles className="h-10 w-10 text-primary" />
            <h3 className="text-xl font-semibold">You cleared it all.</h3>
            <p className="text-muted-foreground">Take a deep breath and feel the space you've created.</p>
            <Button onClick={handleReturnToChat}>Return to Chat</Button>
          </div>
        );

      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6 min-h-[250px]">
            <p className="text-muted-foreground">This experience uses your camera to overlay virtual, breakable objects onto your environment. Tap to smash them!</p>
            {!hasCameraPermission ? (
              <Button onClick={() => setGameState('requestingPermission')} disabled={gameState === 'requestingPermission'}>
                <Camera className="mr-2 h-4 w-4" />
                Enable Camera
              </Button>
            ) : (
                 <Button onClick={handleStartGame}>
                    Start Game
                 </Button>
            )}
            {hasCameraPermission === false && (
                <Alert variant="destructive" className="w-auto text-left">
                    <AlertTitle>Camera Access Required</AlertTitle>
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
