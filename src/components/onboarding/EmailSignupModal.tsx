import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface EmailSignupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmailSignupModal({ open, onClose, onSuccess }: EmailSignupModalProps) {
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
          setLoading(false);
          return;
        }
      } else {
        if (password.length < 6) {
          toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
          setLoading(false);
          return;
        }
        // Auto sign-in after signup
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          toast({ title: 'Check your email', description: 'Please verify your email address before signing in.', variant: 'destructive' });
          setLoading(false);
          return;
        }
      }

      toast({ title: isLogin ? 'Welcome back!' : 'Account created!', description: 'Your progress has been saved.' });
      onSuccess();
    } catch (err) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {isLogin ? 'Welcome back' : 'Save your progress'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {isLogin
              ? 'Sign in to continue where you left off.'
              : 'Create an account to save your publication data and start generating posts.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!isLogin && (
            <div>
              <Label htmlFor="fullName" className="text-zinc-300 text-sm">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                required={!isLogin}
                className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email" className="text-zinc-300 text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@publication.com"
              required
              className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-zinc-300 text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-400 text-white font-semibold shadow-lg shadow-purple-500/20"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-2">
          {isLogin ? (
            <>Don't have an account?{' '}
              <button onClick={() => setIsLogin(false)} className="text-purple-400 hover:text-purple-300 font-medium">
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => setIsLogin(true)} className="text-purple-400 hover:text-purple-300 font-medium">
                Log in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
