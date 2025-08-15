// lib/stripe.js
import Stripe from 'stripe';

export function getStripeMode() {
  const m = (process.env.NEXT_PUBLIC_STRIPE_MODE || 'test').toLowerCase();
  return m === 'live' ? 'live' : 'test';
}

export function getSecretsByMode() {
  const mode = getStripeMode();
  if (mode === 'live') {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY_LIVE,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_LIVE,
    };
  }
  return {
    secretKey: process.env.STRIPE_SECRET_KEY_TEST,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_TEST,
  };
}

export function getStripeClient() {
  const { secretKey } = getSecretsByMode();
  if (!secretKey) {
    throw new Error(`[stripe] Missing secret key for mode ${getStripeMode()}`);
  }
  return new Stripe(secretKey, { apiVersion: '2024-06-20' });
}

export function getWebhookSecret() {
  const { webhookSecret } = getSecretsByMode();
  if (!webhookSecret) {
    throw new Error(`[stripe] Missing webhook secret for mode ${getStripeMode()}`);
  }
  return webhookSecret;
}

export function getKeySnapshot() {
  const { secretKey, publishableKey, webhookSecret } = getSecretsByMode();
  const mask = (v) => (v ? `${v.slice(0, 7)}…${v.slice(-4)}` : 'missing');
  return {
    mode: getStripeMode(),
    secretKey: mask(secretKey || ''),
    publishableKey: mask(publishableKey || ''),
    webhookSecret: mask(webhookSecret || ''),
  };
}
