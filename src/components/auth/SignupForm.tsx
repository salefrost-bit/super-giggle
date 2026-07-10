'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

export function SignupForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const { error: signUpError } = await signUp(email, password);
    setIsSubmitting(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center gap-4 px-7 text-center">
        <p className="text-lg font-bold">Registracija uspešna!</p>
        <p className="text-sm text-muted">Proveri email da potvrdiš nalog pre prijave.</p>
        <Link href="/login" className="text-accent font-bold underline">
          Idi na prijavu
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen flex flex-col justify-center gap-4 px-7">
      <h1 className="text-[28px] font-extrabold mb-2">Registracija</h1>
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
        minLength={6}
        placeholder="Lozinka (min. 6 karaktera)"
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
        {isSubmitting ? 'Kreiranje naloga...' : 'Registruj se'}
      </button>
      <Link href="/" className="text-center text-sm text-muted underline">
        ← Nazad na početak
      </Link>
    </form>
  );
}
