'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { generatePuzzles } from '@/ai/flows/generate-puzzles';
import { CheckCircle, Lightbulb, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

type Puzzle = {
  type: string;
  question: string;
  answer: string;
};

type Feedback = 'correct' | 'incorrect' | null;

export function Puzzles() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [showAnswer, setShowAnswer] = useState<boolean[]>([]);

  const fetchPuzzles = async () => {
    setIsLoading(true);
    try {
      const result = await generatePuzzles();
      setPuzzles(result.puzzles);
      setUserAnswers(new Array(result.puzzles.length).fill(''));
      setFeedback(new Array(result.puzzles.length).fill(null));
      setShowAnswer(new Array(result.puzzles.length).fill(false));
    } catch (error) {
      console.error('Failed to fetch puzzles:', error);
      // Fallback to a default puzzle
      const fallbackPuzzles = [
        {
          type: 'Logic Puzzle',
          question: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?',
          answer: 'A map',
        },
      ];
      setPuzzles(fallbackPuzzles);
      setUserAnswers(['']);
      setFeedback([null]);
      setShowAnswer([false]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    setUserAnswers(newAnswers);

    const newFeedback = [...feedback];
    if (newFeedback[index] !== null) {
      newFeedback[index] = null;
      setFeedback(newFeedback);
    }
  };

  const checkAnswer = (index: number) => {
    const isCorrect = userAnswers[index].trim().toLowerCase() === puzzles[index].answer.toLowerCase().replace('.', '');
    const newFeedback = [...feedback];
    newFeedback[index] = isCorrect ? 'correct' : 'incorrect';
    setFeedback(newFeedback);
  };
  
  const toggleShowAnswer = (index: number) => {
    const newShowAnswer = [...showAnswer];
    newShowAnswer[index] = !newShowAnswer[index];
    setShowAnswer(newShowAnswer);
  }

  if (isLoading && puzzles.length === 0) {
    return (
      <Card className="w-full max-w-md bg-background/50">
        <CardHeader>
          <CardTitle>Generating Puzzles...</CardTitle>
          <CardDescription>A little distraction to engage your mind.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-background/50">
      <CardHeader>
        <CardTitle>Creative Puzzles</CardTitle>
        <CardDescription>A little distraction to engage your mind.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Carousel className="w-full">
          <CarouselContent>
            {puzzles.map((puzzle, index) => (
              <CarouselItem key={index}>
                <div className="p-1">
                  <p className="text-sm font-semibold text-primary">{puzzle.type}</p>
                  <p className="font-medium my-2">{puzzle.question}</p>
                  <div className="relative">
                    <Input
                      placeholder="Your answer..."
                      value={userAnswers[index]}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      className="pr-10"
                    />
                    {feedback[index] === 'correct' && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                    {feedback[index] === 'incorrect' && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />}
                  </div>

                  {showAnswer[index] && (
                    <div className="mt-2 p-3 rounded-md bg-primary/10 text-primary-foreground animate-in fade-in">
                      <p className="text-primary font-semibold">{puzzles[index].answer}</p>
                    </div>
                  )}

                  <div className='flex gap-2 mt-4'>
                     <Button variant="secondary" onClick={() => checkAnswer(index)} className="w-full">
                        Check Answer
                     </Button>
                     <Button variant="outline" onClick={() => toggleShowAnswer(index)} className="w-full">
                        <Lightbulb className="mr-2 h-4 w-4" />
                        {showAnswer[index] ? 'Hide Answer' : 'Show Answer'}
                     </Button>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {puzzles.length > 1 && <>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </>}
        </Carousel>

        <Button onClick={fetchPuzzles} disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Generate More Puzzles
        </Button>
      </CardContent>
    </Card>
  );
}
