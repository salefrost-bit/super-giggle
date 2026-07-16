'use client';

import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth/AuthContext';

const INPUT_CLASSES =
  'w-full rounded-[14px] px-4 py-3.5 text-sm font-bold text-foreground placeholder:text-[#52525b] bg-[#212124] border border-[#303036] outline-none transition-[border-color,box-shadow] duration-200 focus:border-accent focus:shadow-[0_0_0_3px_rgba(204,255,0,0.12)]';

export function SignupForm() {
  const t = useTranslations();
  const { signUp } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // S23: banner se prikazuje samo kad se dolazi sa rezultata (SummaryScreen
  // gost-poeni CTA nosi ?points=), ne pri direktnoj navigaciji na /signup.
  const pointsParam = searchParams.get('points');
  const guestPoints = pointsParam ? Number(pointsParam) : null;

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
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-8">
      <div className="flex items-center gap-3.5 mb-8">
        <Link
          href="/"
          aria-label={t('common.back')}
          className="bg-surface text-foreground w-10 h-10 rounded-xl text-lg font-extrabold flex items-center justify-center flex-none"
        >
          ←
        </Link>
        <h1 className="text-[24px] font-extrabold">{t('auth.signupTitle')}</h1>
      </div>
      {guestPoints !== null && Number.isFinite(guestPoints) && guestPoints > 0 && (
        <div
          className="flex items-center gap-3 rounded-[18px] p-4 mb-6"
          style={{
            background: 'linear-gradient(160deg,#26262b,#1d1d20)',
            border: '1px solid rgba(204,255,0,.35)',
          }}
        >
          <div className="font-black text-2xl text-accent tabular-nums flex-none">
            {guestPoints.toLocaleString()}
          </div>
          <p className="text-xs font-semibold text-muted leading-snug">
            {t('auth.guestBanner', { points: guestPoints })}
          </p>
        </div>
      )}
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
            minLength={6}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASSES}
          />
          <p className="text-[11px] font-semibold text-[#52525b] mt-1.5">{t('auth.passwordMin')}</p>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-background rounded-[16px] p-4 font-extrabold text-[15px] tracking-[0.06em] disabled:opacity-50 mt-1"
          style={{ boxShadow: '0 0 30px rgba(204,255,0,.25)' }}
        >
          {isSubmitting ? t('auth.creating') : t('auth.signupCta')}
        </button>
        <p className="text-center text-xs font-bold text-muted">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="text-accent font-extrabold">
            {t('auth.goLogin')}
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
