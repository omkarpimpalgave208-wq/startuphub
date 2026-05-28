import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign up with Supabase Auth
      // PostgreSQL trigger handles profiles record insert atomically!
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            full_name: formData.fullName
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Create your account
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Join the startup community today
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 rounded-lg text-sm">
              Supabase is not configured. Please add <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to your environment variables.
            </div>
          )}

          {/* Social signup */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => signInWithGoogle('StartupHub')}
              disabled={!isSupabaseConfigured}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50 text-zinc-950 dark:text-zinc-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500">
                Or sign up with email
              </span>
            </div>
          </div>

          {/* Signup form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="johndoe"
              required
            />
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
              required
            />
            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
            <Input
              type="password"
              label="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              helperText="Must be at least 6 characters"
              required
              minLength={6}
            />
            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!isSupabaseConfigured}
            >
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-orange-500 hover:text-orange-600"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}