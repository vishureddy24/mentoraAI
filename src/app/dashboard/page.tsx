import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquare, BookUser } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8 bg-background">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-headline text-foreground">Dashboard</h1>
        <Link href="/chat" className="text-primary hover:underline">
          Back to Chat
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-lg bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center gap-4">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>About MentoraAI</CardTitle>
              <CardDescription>Your emotionally intelligent companion.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              MentoraAI is designed to be a safe and supportive space for you. I'm here to listen without judgment, help you navigate your feelings, and offer tools and techniques to build emotional resilience.
            </p>
            <p>
              Whether you're feeling sad, angry, or just want to talk, I can provide a listening ear and suggest activities like guided breathing, creative puzzles, or journaling to help you feel better.
            </p>
            <p className="font-semibold text-foreground">
              Remember, your privacy is my priority. Your conversations are your own.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center gap-4">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Chat History</CardTitle>
              <CardDescription>Review your past conversations.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted-foreground">Chat history feature is coming soon!</p>
            <p className="text-xs text-muted-foreground mt-2">Your conversations will be stored locally and securely on your device.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
