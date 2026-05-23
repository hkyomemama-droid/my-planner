import { kv } from '@vercel/kv';

const KEY = 'planner-data';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const data = await kv.get(KEY);
    res.json(data ?? {});
  } else if (req.method === 'POST') {
    await kv.set(KEY, req.body);
    res.json({ ok: true });
  } else {
    res.status(405).json({});
  }
}
