'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Bot, BrainCircuit, Gamepad2, Loader2, MessageCircle, Send, Wind, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, CopingMechanism } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Logo } from './icons/logo';

import { analyzeUserSentiment } from '@/ai/flows/analyze-user-sentiment';
import { provideEmpatheticResponse } from '@/ai/flows/provide-empathetic-response';
import { recommendCopingMechanisms } from '@/ai/flows/recommend-coping-mechanisms';
import { safetyNetProtocol } from '@/ai/flows/safety-net-protocol';

import { BreathingExercise } from './coping/breathing-exercise';
import { SmashTheStress } from './coping/smash-the-stress';
import { Journal } from './coping/journal';
import { Puzzles } from './coping/puzzles';

const choiceMap: Record<string, { icon: React.ElementType; label: string; component: React.ElementType }> = {
  'creative puzzle': { icon: Puzzle, label: 'Creative Puzzle', component: Puzzles },
  'quick game': { icon: Gamepad2, label: 'Smash-the-Stress', component: SmashTheStress },
  'breathing exercise': { icon: Wind, label: 'Breathing Exercise', component: BreathingExercise },
  'anger dump journal': { icon: BrainCircuit, label: 'Anger Dump Journal', component: Journal },
  'just talk': { icon: MessageCircle, label: 'Just Talk', component: () => null },
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: "Hello. I'm MentoraAI. How are you feeling today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleChoice = (choiceKey: string) => {
    const choice = choiceMap[choiceKey.toLowerCase().replace(/[^a-z\s]/gi, '').trim()];

    setMessages(prev => prev.filter(m => m.type !== 'choices'));

    if (choice) {
      if (choice.label === 'Just Talk') {
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), role: 'model', content: "Of course. I'm here to listen." },
        ]);
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          type: 'activity',
          content: <choice.component />,
        },
      ]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const sentiment = await analyzeUserSentiment({ message: userInput });

      if (sentiment.intensity.toLowerCase() === 'severe' || sentiment.keywords.length > 0) {
        const safetyResponse = await safetyNetProtocol({});
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString() + '-safety', role: 'model', type: 'safety-net', content: safetyResponse.message },
        ]);
        return;
      }

      const empatheticResponse = await provideEmpatheticResponse({ userInput, emotion: sentiment.emotion });
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString() + '-empathy', role: 'model', content: empatheticResponse.empatheticResponse },
      ]);

      const recommendations = await recommendCopingMechanisms({ emotion: sentiment.emotion });

      const choices = (
        <div className="flex flex-wrap gap-2">
          {recommendations.recommendations.map((rec, index) => {
            const key = rec.toLowerCase().replace(/[^a-z\s]/gi, '').trim();
            const choiceDetails = choiceMap[key];
            const Icon = choiceDetails ? choiceDetails.icon : BrainCircuit;
            return (
              <Button key={index} variant="outline" onClick={() => handleChoice(rec)} className="bg-background/80">
                <Icon className="mr-2 h-4 w-4" />
                {rec}
              </Button>
            );
          })}
        </div>
      );

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + '-choices',
          role: 'model',
          type: 'choices',
          content: (
            <>
              <p className="mb-4">I'm here with you. Would you like to...</p>
              {choices}
            </>
          ),
        },
      ]);
    } catch (error) {
      console.error('AI Error:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem communicating with the AI. Please try again.',
      });
      setMessages(prev => prev.slice(0, prev.length - (prev[prev.length - 1].role === 'user' ? 0 : 1)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-4 border-b p-4">
        <div className="h-10 w-10">
          <Logo />
        </div>
        <div>
          <h1 className="text-xl font-bold font-headline">MentoraAI</h1>
          <p className="text-sm text-muted-foreground">Your personal companion</p>
        </div>
      </header>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-6 space-y-6">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn('flex items-start gap-4 animate-in fade-in', message.role === 'user' ? 'justify-end' : '')}
            >
              {message.role === 'model' && (
                <Avatar className="h-9 w-9 border-2 border-primary/50">
                  <AvatarFallback className="bg-primary/20">
                    <Bot className="h-5 w-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-md rounded-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.05)]',
                  message.role === 'user'
                    ? 'rounded-br-none bg-primary text-primary-foreground'
                    : 'rounded-bl-none bg-card',
                  message.type === 'safety-net' && 'bg-destructive/10 border border-destructive text-destructive-foreground'
                )}
              >
                {typeof message.content === 'string' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
              <Avatar className="h-9 w-9 border-2 border-primary/50">
                <AvatarFallback className="bg-primary/20">
                  <Bot className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-md rounded-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.05)] bg-card rounded-bl-none">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-card/50 p-4">
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[48px] resize-none pr-20"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2" disabled={isLoading || !input.trim()}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
