const express = require('express');
const app = express();
app.use(express.json());
const path = require('path');
['index.html', 'extras.js', 'manifest.json', 'sw.js', 'icon.svg'].forEach(f => app.get('/' + f, (q, r) => r.sendFile(path.join(__dirname, f))));
app.get('/', (q, r) => r.sendFile(path.join(__dirname, 'index.html')));

const TD = process.env.TWELVE_DATA_KEY;
const TT = process.env.TELEGRAM_TOKEN, TC = process.env.TELEGRAM_CHAT_ID;
const WP = process.env.WHATSAPP_PHONE, WK = process.env.CALLMEBOT_KEY;
const RK = process.env.RESEND_API_KEY, ET = process.env.ALERT_EMAIL_TO;
const IV = { '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min', '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week' };
const SYMS = ['XAU/USD', 'XAG/USD', 'XPT/USD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'BTC/USD', 'ETH/USD'];
const VP = { 'XAU/USD': 'GLD', 'XAG/USD': 'SLV', 'XPT/USD': 'PPLT', 'BTC/USD': 'BTC/USD', 'ETH/USD': 'ETH/USD' };
const cache = {};

app.get('/api/candles', async (req, res) => {
  const iv = IV[req.query.i], sym = SYMS.includes(req.query.s) ? req.query.s : 'XAU/USD';
  if (!iv) return res.status(400).json({ error: 'Unknown timeframe' });
  if (!TD) return res.status(500).json({ error: 'Add TWELVE_DATA_KEY in Replit Secrets' });
  const key = sym + iv, c = cache[key];
  if (c && Date.now() - c.t < 45000) return res.json(c.d);
  try {
    const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${sym}&interval=${iv}&outputsize=500&order=asc&timezone=UTC&apikey=${TD}`);
    const j = await r.json();
    if (j.status === 'error' || !j.values) return res.status(502).json({ error: j.message || 'No data' });
    const d = j.values.map(v => ({ t: v.datetime, o: +v.open, h: +v.high, l: +v.low, c: +v.close }));
    cache[key] = { t: Date.now(), d };
    res.json(d);
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get('/api/volume', async (req, res) => {
  const iv = IV[req.query.i], sym = SYMS.includes(req.query.s) ? req.query.s : 'XAU/USD', px = VP[sym];
  if (!iv) return res.status(400).json({ error: 'Unknown timeframe' });
  if (!px) return res.json({ source: null });
  if (!TD) return res.status(500).json({ error: 'Add TWELVE_DATA_KEY in Replit Secrets' });
  const key = 'v' + px + iv, c = cache[key];
  if (c && Date.now() - c.t < 45000) return res.json(c.d);
  try {
    const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${px}&interval=${iv}&outputsize=500&order=asc&timezone=UTC&apikey=${TD}`);
    const j = await r.json();
    if (j.status === 'error' || !j.values) return res.status(502).json({ error: j.message || 'No volume data' });
    const v = {};
    j.values.forEach(x => { v[x.datetime] = +x.volume || 0; });
    const d = { source: px === sym ? sym : px + ' ETF (proxy)', v };
    cache[key] = { t: Date.now(), d };
    res.json(d);
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.post('/api/alert', async (req, res) => {
  const b = req.body || {}, text = String(b.text || '').slice(0, 500), ch = b.ch || [], out = {};
  const send = async (name, fn) => {
    try { const r = await fn(); out[name] = r.ok ? 'sent' : 'failed (' + r.status + ')'; }
    catch (e) { out[name] = 'failed: ' + e.message; }
  };
  const J = { 'content-type': 'application/json' };
  if (ch.includes('tg')) {
    if (TT && TC) await send('Telegram', () => fetch(`https://api.telegram.org/bot${TT}/sendMessage`, { method: 'POST', headers: J, body: JSON.stringify({ chat_id: TC, text }) }));
    else out.Telegram = 'not set up';
  }
  if (ch.includes('wa')) {
    if (WP && WK) await send('WhatsApp', () => fetch(`https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(WP)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(WK)}`));
    else out.WhatsApp = 'not set up';
  }
  if (ch.includes('em')) {
    if (RK && ET) await send('Email', () => fetch('https://api.resend.com/emails', { method: 'POST', headers: { ...J, Authorization: 'Bearer ' + RK }, body: JSON.stringify({ from: 'Accuracy Gold <onboarding@resend.dev>', to: [ET], subject: text.slice(0, 80), text }) }));
    else out.Email = 'not set up';
  }
  res.json({ results: out });
});

app.listen(process.env.PORT || 3000);
