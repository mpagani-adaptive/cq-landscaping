// Free-estimate form: emails C&Q (Web3Forms) and pings Telegram. Env (Vercel project):
//   WEB3FORMS_ACCESS_KEY  key registered to C&Q's inbox (web3forms.com), emails go there
//   TELEGRAM_BOT_TOKEN    crewpost bot (@SodFatherBot)
//   TELEGRAM_CHAT_IDS     comma-separated chat ids to ping (Mike, Colby, ...)
//   FORM_SECRET           HMAC key for the anti-bot form token
//
// Anti-spam: GET issues a signed timestamp the page must send back. No/forged token, a
// submit under MIN_FILL_MS after page load, the honeypot, or links in the text => dropped
// silently (200 ok) so bots don't learn what tripped them.
import crypto from 'node:crypto';

const MIN_FILL_MS = 4000;
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const sign = (t) => crypto.createHmac('sha256', process.env.FORM_SECRET || '').update(String(t)).digest('hex');

function tokenProblem(body) {
  if (!process.env.FORM_SECRET) return null; // not configured: don't block real people
  const t = Number(body.t);
  const sig = String(body.sig || '');
  if (!t || sig.length !== 64) return 'no token';
  const good = sign(t);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return 'bad token';
  const age = Date.now() - t;
  if (age < MIN_FILL_MS) return `too fast (${age}ms)`;
  if (age > MAX_AGE_MS) return 'token expired';
  return null;
}

const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|xyz|io|info|biz|top|site|online|shop)\b)/i;
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

async function sendEmail(lead) {
  const key = process.env.WEB3FORMS_ACCESS_KEY;
  if (!key) return { ok: false, skipped: 'no WEB3FORMS_ACCESS_KEY' };
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: key,
      subject: `New estimate request: ${lead.name}`,
      from_name: 'cqyards.com',
      // Web3Forms requires an email field; customers give a phone instead.
      email: 'noreply@cqyards.com',
      Name: lead.name,
      Phone: lead.phone,
      'Address and job': lead.details || '(not given)',
    }),
  });
  const j = await res.json().catch(() => ({}));
  return { ok: res.ok && j.success !== false, status: res.status };
}

async function sendTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ids = (process.env.TELEGRAM_CHAT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !ids.length) return { ok: false, skipped: 'telegram not configured' };
  const text = `🌱 New estimate request (cqyards.com)\n\n${lead.name}\n📞 ${lead.phone}\n\n${lead.details || '(no details)'}`;
  const results = await Promise.all(ids.map((chat_id) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text }),
    }).then((r) => r.ok).catch(() => false)));
  return { ok: results.some(Boolean) };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const t = Date.now();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ t, sig: sign(t) });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const body = await readBody(req);
  const spam = body.website ? 'honeypot'
    : tokenProblem(body)
    || (LINK_RE.test(`${body.name || ''} ${body.details || ''}`) ? 'link in text' : null);
  if (spam) {
    console.log('[estimate] dropped spam:', spam);
    return res.status(200).json({ ok: true });
  }
  const lead = { name: clean(body.name, 100), phone: clean(body.phone, 40), details: String(body.details ?? '').trim().slice(0, 2000) };
  if (!lead.name || lead.phone.replace(/\D/g, '').length < 7) {
    return res.status(400).json({ ok: false, error: 'Please add your name and a phone number.' });
  }
  const [email, telegram] = await Promise.all([sendEmail(lead).catch((e) => ({ ok: false, error: e.message })), sendTelegram(lead)]);
  console.log('[estimate]', JSON.stringify({ email, telegram }));
  if (!email.ok && !telegram.ok) {
    return res.status(502).json({ ok: false, error: 'That did not go through. Please call or text 724-888-0762.' });
  }
  return res.status(200).json({ ok: true });
}
