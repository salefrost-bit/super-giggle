'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';

export function LoginForm() {
  const t = useTranslations();
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
      <h1 className="text-[28px] font-extrabold mb-2">{t('auth.loginTitle')}</h1>
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
        placeholder={t('auth.password')}
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
        {isSubmitting ? t('auth.loggingIn') : t('auth.loginCta')}
      </button>
      <Link href="/" className="text-center text-sm text-muted underline">
        {t('auth.backHome')}
      </Link>
    </form>
  );
}
