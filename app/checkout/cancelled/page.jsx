'use client';

import Link from 'next/link';

export default function CheckoutCancelled() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Payment cancelled</h1>
      <p className="opacity-80">
        Your checkout was cancelled. You can return to the boutique and try again anytime.
      </p>
      <Link href="/u/stephanie" className="underline">← Back to boutique</Link>
    </div>
  );
}
