'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function Journal() {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    setText('');
    setSubmitted(true);
    toast({
      title: 'Message Deleted',
      description: 'Your entry has been securely wiped. I hope that helped.',
    });
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md bg-background/50 border-primary/20">
        <CardContent className="p-6 text-center">
          <p>Your entry has been securely deleted. Better out than in. I'm here when you're ready to talk.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-background/50">
      <CardHeader>
        <CardTitle>Anger Dump Journal</CardTitle>
        <CardDescription>A private space to write anything. It will be securely deleted after submission.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Let it all out..."
          className="min-h-[120px]"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <Button onClick={handleSubmit} disabled={!text.trim()} className="w-full" variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Securely Delete Forever
        </Button>
      </CardContent>
    </Card>
  );
}
