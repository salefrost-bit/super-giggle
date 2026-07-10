'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';

export function SignupForm() {
  const t = useTranslations();
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
        <p className="text-lg font-bold">{t('auth.successTitle')}</p>
        <p className="text-sm text-muted">{t('auth.successNote')}</p>
        <Link href="/login" className="text-accent font-bold underline">
          {t('auth.goLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen flex flex-col justify-center gap-4 px-7">
      <h1 className="text-[28px] font-extrabold mb-2">{t('auth.signupTitle')}</h1>
      <input
        type="email"
        required
        placeholder={t('auth.email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-surface border-2 border-white/5 rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted focus:border-accent/50 outline-none"
      />
      <input
        type="password"
        required
        minLength={6}
        placeholder={t('auth.passwordMin')}
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
        {isSubmitting ? t('auth.creating') : t('auth.signupCta')}
      </button>
      <Link href="/" className="text-center text-sm text-muted underline">
        {t('auth.backHome')}
      </Link>
    </form>
  );
}
