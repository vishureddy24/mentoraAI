'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState, useEffect } from 'react';

export function BreathingExercise() {
  const [text, setText] = useState('Get ready...');
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    const sequence = [
      { text: 'Breathe in...', duration: 4000, animation: 'animate-inhale' },
      { text: 'Hold...', duration: 4000, animation: 'animate-hold' },
      { text: 'Breathe out...', duration: 6000, animation: 'animate-exhale' },
      { text: 'Get ready...', duration: 2000, animation: '' },
    ];

    let currentIndex = -1;
    let timer: NodeJS.Timeout;

    const nextStep = () => {
      currentIndex = (currentIndex + 1) % sequence.length;
      const { text, duration, animation } = sequence[currentIndex];
      setText(text);
      setAnimationClass(animation);
      timer = setTimeout(nextStep, duration);
    };

    nextStep();

    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="w-full max-w-md bg-background/50 border-primary/20">
      <style>{`
        @keyframes inhale {
          0% { transform: scale(1); }
          100% { transform: scale(1.5); }
        }
        @keyframes hold {
          0%, 100% { transform: scale(1.5); }
        }
        @keyframes exhale {
          0% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
        .animate-inhale { animation: inhale 4s ease-in-out forwards; }
        .animate-hold { animation: hold 4s ease-in-out forwards; }
        .animate-exhale { animation: exhale 6s ease-in-out forwards; }
      `}</style>
      <CardHeader>
        <CardTitle>Guided Breathing</CardTitle>
        <CardDescription>Follow the circle and instructions to calm your mind.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-8 py-8">
        <div className="relative h-32 w-32 flex items-center justify-center">
          <div
            className={`h-24 w-24 rounded-full bg-primary/20 transition-transform duration-1000 ease-in-out ${animationClass}`}
          ></div>
        </div>
        <p className="text-xl font-semibold text-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
