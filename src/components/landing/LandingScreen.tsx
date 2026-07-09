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
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-3xl font-bold">Trening App</h1>
      {user ? (
        <>
          <p>Prijavljen kao {user.email}</p>
          <button onClick={onStartWorkout} className="bg-blue-600 text-white rounded px-6 py-3">
            Novi trening
          </button>
          <button onClick={onShowHistory} className="border rounded px-6 py-3">
            Istorija treninga
          </button>
          <button onClick={onSignOut} className="text-sm text-gray-500 underline">
            Odjavi se
          </button>
        </>
      ) : (
        <>
          <button onClick={onStartWorkout} className="bg-blue-600 text-white rounded px-6 py-3">
            Nastavi kao gost
          </button>
          <Link href="/login" className="border rounded px-6 py-3 text-center">
            Prijavi se
          </Link>
          <Link href="/signup" className="text-sm text-gray-500 underline">
            Napravi nalog
          </Link>
        </>
      )}
    </div>
  );
}
