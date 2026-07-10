'use client';

import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

interface LandingScreenProps {
  user: User | null;
  onStartWorkout: () => void;
  onShowHistory: () => void;
  onSignOut: () => void;
}

export function LandingScreen({ user, onStartWorkout, onShowHistory, onSignOut }: LandingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col justify-between px-7 pt-12 pb-9">
      <div />
      <div className="flex flex-col items-center gap-[18px] text-center">
        <div className="w-[88px] h-[88px] rounded-3xl bg-surface border-2 border-accent/50 flex items-center justify-center text-[40px] font-black text-accent">
          ♠
        </div>
        <div>
          <h1 className="text-[38px] font-black leading-[1.05] tracking-tight">ŠPIL</h1>
          <p className="text-base font-semibold text-muted mt-2 leading-snug">
            Trening bez opreme.
            <br />
            Izvuci kartu, odradi seriju.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {user ? (
          <>
            <p className="text-center text-[13px] text-muted font-semibold">
              Ulogovan · napredak se čuva
            </p>
            <button
              onClick={onStartWorkout}
              className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg"
            >
              Novi trening
            </button>
            <button onClick={onShowHistory} className="text-accent font-bold text-[15px] p-1.5">
              Vidi istoriju treninga →
            </button>
            <button onClick={onSignOut} className="text-sm text-muted underline">
              Odjavi se
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartWorkout}
              className="bg-accent text-background rounded-[18px] p-5 font-extrabold text-lg"
            >
              Nastavi kao gost
            </button>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 border-2 border-white/15 text-foreground rounded-2xl p-3.5 font-bold text-[15px] text-center"
              >
                Prijavi se
              </Link>
              <Link
                href="/signup"
                className="flex-1 border-2 border-white/15 text-foreground rounded-2xl p-3.5 font-bold text-[15px] text-center"
              >
                Napravi nalog
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
