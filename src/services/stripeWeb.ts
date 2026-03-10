import { RuntimeConfig } from '../config/runtimeConfig';

export async function startStripeCheckout(userId: string) {
  const endpoint = RuntimeConfig.stripeCheckoutApiUrl || '/api/stripe/checkout';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      priceId: RuntimeConfig.stripePriceId || 'price_placeholder',
      successUrl:
        RuntimeConfig.stripeSuccessUrl ||
        'https://www.tomoflow.app/paywall?checkout=success',
      cancelUrl:
        RuntimeConfig.stripeCancelUrl ||
        'https://www.tomoflow.app/paywall?checkout=cancel',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create Stripe checkout session.');
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error('Stripe checkout URL missing from server response.');
  }

  if (typeof window !== 'undefined') {
    window.location.href = data.url;
  }
}
