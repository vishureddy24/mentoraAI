'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Chrome, Phone } from 'lucide-react';
import Link from 'next/link';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // On successful sign-in, redirect to the chat page.
      window.location.href = '/chat';
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'Could not sign in with Google. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={handleGoogleSignIn}>
          <Chrome className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button variant="outline">
          <Phone className="mr-2 h-4 w-4" />
          Phone
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="m@example.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" />
      </div>

      <Link href="/chat">
        <Button className="w-full">{isSignUp ? 'Create Account' : 'Sign In'}</Button>
      </Link>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-primary underline-offset-4 hover:underline">
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
}
