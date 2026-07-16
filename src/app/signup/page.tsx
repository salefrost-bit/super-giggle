import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';

// SignupForm koristi useSearchParams() (gost-poeni banner iz ?points= —
// S23) — Next.js zahteva Suspense granicu oko toga za statičku izgradnju.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
