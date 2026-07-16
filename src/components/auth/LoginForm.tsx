'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';

const INPUT_CLASSES =
  'w-full rounded-[14px] px-4 py-3.5 text-sm font-bold text-foreground placeholder:text-[#52525b] bg-[#212124] border border-[#303036] outline-none transition-[border-color,box-shadow] duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgba(204,255,0,0.12)]';

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
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-8">
        <Link
          href="/"
          aria-label={t('common.back')}
          className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold flex items-center justify-center flex-none"
        >
          ←
        </Link>
        <h1 className="text-[24px] font-extrabold">{t('auth.loginTitle')}</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-[0.12em] text-muted uppercase mb-1.5">
            {t('auth.email')}
          </div>
          <input
            type="email"
            required
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <div className="text-[11px] font-extrabold tracking-[0.12em] text-muted uppercase mb-1.5">
            {t('auth.password')}
          </div>
          <input
            type="password"
            required
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASSES}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-background rounded-[16px] p-4 font-extrabold text-[15px] tracking-[0.06em] disabled:opacity-50 mt-1"
          style={{ boxShadow: '0 0 30px rgba(204,255,0,.25)' }}
        >
          {isSubmitting ? t('auth.loggingIn') : t('auth.loginCta')}
        </button>
        <p className="text-center text-xs font-bold text-muted">
          {t('auth.noAccount')}{' '}
          <Link href="/signup" className="text-accent font-extrabold">
            {t('auth.joinTable')}
          </Link>
        </p>
        <div className="flex-1" />
        <Link href="/" className="text-center text-xs font-bold text-[#52525b] hover:text-muted">
          {t('auth.keepGuest')}
        </Link>
      </form>
    </div>
  );
}
