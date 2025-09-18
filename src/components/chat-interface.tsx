'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Bot, BrainCircuit, Gamepad2, Loader2, MessageCircle, Send, Wind, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Logo } from './icons/logo';

import { handleChatTurn } from '@/ai/flows/handle-chat-turn';
import { safetyNetProtocol } from '@/ai/flows/safety-net-protocol';
import { handleUserChoice } from '@/ai/flows/handle-user-choice';

import { BreathingExercise } from './coping/breathing-exercise';
import { Journal } from './coping/journal';
import { Puzzles } from './coping/puzzles';

const choiceMap: Record<string, { icon: React.ElementType; label: string; action: string }> = {
  "do a short, guided breathing exercise to find some calm? 🧘": { icon: Wind, label: 'Breathing Exercise', action: 'start_breathing' },
  "try a simple creative puzzle to distract your mind? 🧠": { icon: Puzzle, label: 'Creative Puzzles', action: 'start_puzzle' },
  "play 'fruit frenzy' to slice away the stress? 🥑": { icon: Gamepad2, label: 'Fruit Frenzy', action: 'start_fruit_slicer' },
  "write it all out in a private 'anger journal'? 📝": { icon: BrainCircuit, label: 'Anger Dump Journal', action: 'start_journaling' },
  "or would you prefer to just talk about what's on your mind? 💬": { icon: MessageCircle, label: 'Just Talk', action: 'start_talk' },
  "or just tell me what happened? 💬": { icon: MessageCircle, label: 'Just Talk', action: 'start_talk' },
  "just talk": { icon: MessageCircle, label: 'Just Talk', action: 'start_talk' },
};


const activityMap: Record<string, React.ElementType> = {
  breathing: BreathingExercise,
  puzzles: Puzzles,
  journal: Journal,
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: "Hi there, I'm MentoraAI. I'm here to listen and support you. How are you feeling today? ✨",
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

  const handleChoiceClick = async (action: string, label: string) => {
    if (isLoading) return;

    const userChoiceMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `I'd like to try: ${label}`,
    };
    
    setMessages(prev => [...prev.filter(m => m.type !== 'choices'), userChoiceMessage]);
    setIsLoading(true);

    try {
      const result = await handleUserChoice({ action });
      console.log("--> FRONTEND RECEIVED:", result);

      const newModelMessages: Message[] = [{
        id: Date.now().toString() + '-response',
        role: 'model',
        content: result.response,
      }];
      
      if (result.activity) {
        console.log("--> SETTING ACTIVITY TO:", result.activity);
        if (result.activity === 'fruit-slicer') {
          window.open('/fruit-slicer', '_blank');
          setMessages(prev => [...prev, ...newModelMessages]);
        } else {
          const ActivityComponent = activityMap[result.activity];
          if (ActivityComponent) {
            newModelMessages.push({
              id: Date.now().toString() + '-activity',
              role: 'model',
              type: 'activity',
              content: <ActivityComponent />,
            });
          }
          setMessages(prev => [...prev, ...newModelMessages]);
        }
      } else {
        setMessages(prev => [...prev, ...newModelMessages]);
      }


    } catch (error) {
       console.error('AI Error:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem processing your choice. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userInput };
    
    const currentMessages = [...messages.filter(m => m.type !== 'choices'), userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = currentMessages
        .filter(m => typeof m.content === 'string' && !m.type)
        .map(m => ({
            role: m.role,
            content: m.content as string,
        }));
      
      const result = await handleChatTurn({ message: userInput, history: history.slice(0, -1) });

      if (result.isCritical) {
        const safetyResponse = await safetyNetProtocol({});
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString() + '-safety', role: 'model', type: 'safety-net', content: safetyResponse.message },
        ]);
        setIsLoading(false);
        return;
      }
      
      const empatheticResponseMessage: Message = {
        id: Date.now().toString() + '-empathy',
        role: 'model',
        content: result.empatheticResponse,
      };

      setMessages(prev => [...prev, empatheticResponseMessage]);

      if (result.recommendations && result.recommendations.length > 0) {
        const choices = (
          <div className="flex flex-wrap gap-2">
            {result.recommendations.map((rec, index) => {
              const choiceKey = Object.keys(choiceMap).find(key => rec.toLowerCase().startsWith(key.substring(0, 20)));
              if (!choiceKey) {
                console.warn(`No choice mapping found for recommendation: "${rec}"`);
                return null;
              }
              const choice = choiceMap[choiceKey];
              const Icon = choice.icon;
              return (
                <Button key={index} variant="outline" onClick={() => handleChoiceClick(choice.action, choice.label)} className="bg-background/80 text-left h-auto whitespace-normal">
                  <Icon className="mr-2 h-4 w-4" />
                  {rec.replace(/ \p{Emoji}/gu, '')}
                </Button>
              );
            })}
          </div>
        );

        const recommendationsMessage: Message = {
          id: Date.now().toString() + '-choices',
          role: 'model',
          type: 'choices',
          content: (
            <>
              <p className="mb-4">{result.introductoryText}</p>
              {choices}
            </>
          ),
        };
        setMessages(prev => [...prev, recommendationsMessage]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem communicating with the AI. Please try again.',
      });
      // Rollback the user message if the AI fails
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
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
                handleSubmit();
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
