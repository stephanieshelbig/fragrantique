// /lib/shippo.js
export async function shippoFetch(path, opts = {}) {
  const token = process.env.SHIPPO_API_TOKEN;
  if (!token) throw new Error('Missing SHIPPO_API_TOKEN');
  const res = await fetch(`https://api.goshippo.com${path}`, {
    ...opts,
    headers: {
      'Authorization': `ShippoToken ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>'');
    throw new Error(`Shippo ${path} failed: ${res.status} ${t}`);
  }
  return res.json();
}
