'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';

type GameState = 'idle' | 'requestingPermission' | 'gameStarted' | 'gameEnded';

export function CrystalShatterGame() {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gameState, setGameState] = useState<GameState>('idle');

  useEffect(() => {
    if (gameState === 'requestingPermission') {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setGameState('idle'); // Go back to idle to show the start button
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
  
  const handleReturnToChat = () => {
     // This would typically unmount the component by setting state in the parent
     // For this self-contained example, we'll just reset the state.
     setGameState('idle');
     setHasCameraPermission(null);
  };

  const renderContent = () => {
    switch (gameState) {
      case 'requestingPermission':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
            <Camera className="h-8 w-8 animate-pulse" />
            <p>Requesting camera access...</p>
          </div>
        );
      
      case 'gameStarted':
        return (
           <div className="relative">
            <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                <p className="text-white text-2xl font-bold bg-black/50 p-2 rounded-md">Crystal Shatter! (AR Coming Soon)</p>
            </div>
            <div className="absolute top-2 left-2 bg-black/50 text-white p-2 rounded-md">
              <p>Tap the glowing crystals to shatter them!</p>
            </div>
            <Button onClick={() => setGameState('gameEnded')} className="absolute bottom-2 right-2">
              End Game (Dev)
            </Button>
          </div>
        )

      case 'gameEnded':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-10">
            <Sparkles className="h-10 w-10 text-primary" />
            <h3 className="text-xl font-semibold">You cleared it all.</h3>
            <p className="text-muted-foreground">Take a deep breath and feel the space you've created.</p>
            <Button onClick={handleReturnToChat}>Return to Chat</Button>
          </div>
        );

      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center p-6">
            <p>This experience uses your camera to overlay virtual, breakable objects onto your environment. Tap to smash them!</p>
            <div className="flex gap-2">
              <Button onClick={() => setGameState('requestingPermission')}>
                <Camera className="mr-2 h-4 w-4" />
                Enable Camera
              </Button>
              {hasCameraPermission && (
                 <Button onClick={() => setGameState('gameStarted')}>
                    Start Game
                 </Button>
              )}
            </div>
            {hasCameraPermission === false && (
                <Alert variant="destructive" className="w-auto text-left">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                      Please allow camera access to use this feature.
                    </AlertDescription>
                </Alert>
            )}
             <p className="text-xs text-muted-foreground">Camera access is required to play.</p>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md bg-background/50 border-accent/20">
      <CardContent className="p-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
