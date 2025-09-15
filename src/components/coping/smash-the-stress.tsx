'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';

export function SmashTheStress() {
  const { toast } = useToast();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (isStarted) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this app.',
          });
        }
      };

      getCameraPermission();
    }
  }, [isStarted, toast]);

  const handleStart = () => {
    setIsStarted(true);
  };

  if (isStarted) {
    return (
       <Card className="w-full max-w-md bg-background/50 border-accent/20">
        <CardContent className="p-4">
          <div className="relative">
            <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                 <Alert variant="destructive" className="w-auto">
                    <AlertTitle>Camera Access Required</AlertTitle>
                    <AlertDescription>
                      Please allow camera access to use this feature.
                    </AlertDescription>
                </Alert>
              </div>
            )}
             {hasCameraPermission && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white text-2xl font-bold bg-black/50 p-2 rounded-md">Smash the Stress! (Coming Soon)</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md bg-background/50 border-accent/20">
      <CardHeader>
        <CardTitle>Smash the Stress</CardTitle>
        <CardDescription>Release frustration in this augmented reality mini-game.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 text-center">
        <p>This experience uses your camera to overlay virtual, breakable objects onto your environment. Tap to smash them!</p>
        <Button onClick={handleStart}>
          <Camera className="mr-2 h-4 w-4" />
          Start AR Experience
        </Button>
        <p className="text-xs text-muted-foreground">Camera access will be requested.</p>
      </CardContent>
    </Card>
  );
}
