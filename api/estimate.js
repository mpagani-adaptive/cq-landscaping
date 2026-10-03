// Free-estimate form: emails C&Q (Web3Forms) and pings Telegram. Env (Vercel project):
//   WEB3FORMS_ACCESS_KEY  key registered to C&Q's inbox (web3forms.com), emails go there
//   TELEGRAM_BOT_TOKEN    crewpost bot (@SodFatherBot)
//   TELEGRAM_CHAT_IDS     comma-separated chat ids to ping (Mike, Colby, ...)
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
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const body = await readBody(req);
  if (body.website) return res.status(200).json({ ok: true }); // honeypot: bots fill every field
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
