'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 350, damping: 30 };

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/app');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/app' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2560&q=80)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.2))' }}
      />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md glass-card p-8 sm:p-10"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-full bg-[#d9f99d] flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">Audio Pins</span>
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-8">Sign in to continue to your map</p>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors mb-6"
          style={{ border: '1px solid rgba(0,0,0,0.1)' }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Error */}
        {error && (
          <motion.div
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className="input"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#d9f99d] rounded-xl font-bold text-sm text-gray-900 uppercase tracking-widest hover:bg-[#bef264] transition-all shadow-lg shadow-lime-200/40 disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={loading ? {} : { scale: 1.01 }}
            whileTap={loading ? {} : { scale: 0.98 }}
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-semibold text-gray-900 hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
