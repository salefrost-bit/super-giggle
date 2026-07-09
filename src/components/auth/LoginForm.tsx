'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold">Prijava</h1>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded px-3 py-2"
      />
      <input
        type="password"
        required
        placeholder="Lozinka"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded px-3 py-2"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Prijavljivanje...' : 'Prijavi se'}
      </button>
    </form>
  );
}
