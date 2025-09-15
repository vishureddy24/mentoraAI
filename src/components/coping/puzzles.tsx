'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { useState } from 'react';

const puzzles = [
  {
    type: 'Logic Puzzle',
    question: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?',
    answer: 'A map.',
  },
  {
    type: 'Word Challenge',
    question: "Can you think of 3 words that rhyme with 'hope'?",
    answer: 'Scope, mope, cope, lope, rope, soap...',
  },
  {
    type: 'Riddle',
    question: 'What has to be broken before you can use it?',
    answer: 'An egg.',
  },
];

export function Puzzles() {
  const [puzzle] = useState(() => puzzles[Math.floor(Math.random() * puzzles.length)]);
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <Card className="w-full max-w-md bg-background/50">
      <CardHeader>
        <CardTitle>{puzzle.type}</CardTitle>
        <CardDescription>A little distraction to engage your mind.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium text-lg">{puzzle.question}</p>
        {showAnswer && (
          <div className="p-3 rounded-md bg-primary/10 text-primary-foreground animate-in fade-in">
            <p className="text-primary font-semibold">{puzzle.answer}</p>
          </div>
        )}
        <Button variant="outline" onClick={() => setShowAnswer(!showAnswer)} className="w-full">
          <Lightbulb className="mr-2 h-4 w-4" />
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </Button>
      </CardContent>
    </Card>
  );
}
