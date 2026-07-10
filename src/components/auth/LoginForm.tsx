'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    router.push('/');
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen flex flex-col justify-center gap-4 px-7">
      <h1 className="text-[28px] font-extrabold mb-2">Prijava</h1>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-surface border-2 border-white/5 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted focus:border-accent/50 outline-none"
      />
      <input
        type="password"
        required
        placeholder="Lozinka"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-surface border-2 border-white/5 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted focus:border-accent/50 outline-none"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg disabled:opacity-50"
      >
        {isSubmitting ? 'Prijavljivanje...' : 'Prijavi se'}
      </button>
      <Link href="/" className="text-center text-sm text-muted underline">
        ← Nazad na početak
      </Link>
    </form>
  );
}
