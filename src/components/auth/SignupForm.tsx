'use client';

import { useState, type FormEvent } from 'react';
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
      <div className="max-w-sm mx-auto p-6">
        <p>Registracija uspešna! Proveri email da potvrdiš nalog pre prijave.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold">Registracija</h1>
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
        minLength={6}
        placeholder="Lozinka (min. 6 karaktera)"
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
        {isSubmitting ? 'Kreiranje naloga...' : 'Registruj se'}
      </button>
    </form>
  );
}
