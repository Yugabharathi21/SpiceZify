import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/useAuthStore';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });

  const { login, signup, isLoading, error, clearError } = useAuthStore();

  const handleModeSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    clearError?.(); // Clear any existing errors when switching modes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await signup(formData.email, formData.password, formData.displayName);
        toast.success('Account created successfully!');
      }
    } catch (authError) {
      console.error('Auth error:', authError);
      if (authError instanceof Error) {
        if (authError.message.includes('500') || authError.message.includes('Internal')) {
          toast.warning('Using offline mode - some features may be limited');
        } else {
          toast.error(authError.message);
        }
      } else {
        toast.error('Authentication failed');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Music className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SPiceZify</h1>
          <p className="text-slate-400">
            {mode === 'login' ? 'Welcome back' : 'Join the music revolution'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-card/30 backdrop-blur-xl border border-border rounded-2xl p-8">
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="How should we call you?"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-input border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className={`p-3 rounded-lg text-sm ${
                error.includes('500') || error.includes('offline') || error.includes('Database') || error.includes('database')
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {error.includes('500') || error.includes('offline') || error.includes('Database') || error.includes('database')
                  ? '⚠️ Using offline mode - You can still access all music features!'
                  : `❌ ${error}`
                }
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
                className="text-primary hover:underline font-medium"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-slate-400">
            <div className="w-8 h-8 bg-slate-700 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <p className="text-xs">Local Music</p>
          </div>
          <div className="text-slate-400">
            <div className="w-8 h-8 bg-slate-700 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <p className="text-xs">Play Together</p>
          </div>
          <div className="text-slate-400">
            <div className="w-8 h-8 bg-slate-700 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <p className="text-xs">Smart Playlists</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}