import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SmashTheStress() {
  const { toast } = useToast();

  const handleStart = () => {
    toast({
      title: 'Feature in development',
      description: 'The "Smash-the-Stress" AR game is coming soon!',
    });
  };

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
