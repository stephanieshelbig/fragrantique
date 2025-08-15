import { NextResponse } from 'next/server';
import { sendOrderEmail, renderOrderHtml } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const html = renderOrderHtml({
      sessionId: 'test_session_123',
      buyerEmail: 'buyer@example.com',
      amountTotal: 1234,
      currency: 'usd',
      items: [{ name: 'Test Item', quantity: 1, unit_amount: 1234 }]
    });
    const result = await sendOrderEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'Fragrantique — Test email',
      html
    });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'send failed' }, { status: 500 });
  }
}
