import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { Logo } from '@/components/icons/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16">
              <Logo />
            </div>
            <CardTitle className="text-3xl font-headline">Welcome to MentoraAI</CardTitle>
            <CardDescription>Your emotionally intelligent companion.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Ready to chat?{' '}
          <Link href="/chat" className="font-semibold text-primary underline-offset-4 hover:underline">
            Start as a guest
          </Link>
        </p>
      </div>
    </main>
  );
}
