import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Serve the static client
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'seven_code7-islamic-app', version: '0.1.0' });
});

// Public config for client initialization
app.get('/api/config', (_req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID || '' });
});

// Auth: Google Sign-In (verify ID token and mint a session cookie)
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!SESSION_SECRET) return res.status(500).json({ error: 'Missing SESSION_SECRET' });
    if (!oauthClient) return res.status(500).json({ error: 'Missing GOOGLE_CLIENT_ID' });
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    const ticket = await oauthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    const token = jwt.sign({ uid: user.sub, email: user.email, name: user.name, picture: user.picture }, SESSION_SECRET, { expiresIn: '7d' });
    res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ ok: true, user });
  } catch (e) {
    res.status(401).json({ error: 'Auth failed', details: String(e.message || e) });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  try {
    const { sid } = req.cookies || {};
    if (!sid) return res.status(204).end();
    const data = jwt.verify(sid, SESSION_SECRET);
    res.json({ user: { name: data.name, email: data.email, picture: data.picture } });
  } catch {
    res.status(204).end();
  }
});

// Gemini proxy endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const { messages = [], userProfile = {}, assistantContext = {} } = req.body || {};

    // Map simple chat messages to Gemini contents
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }]
    }));

    // System instruction: polite Islamic assistant persona
    const systemInstruction = {
      role: 'user',
      parts: [{
        text: [
          'أنت مساعد ذكي داخل تطبيق إسلامي شامل، تطوّره seven_code7 بقيادة ليث وبالله.',
          'تتحدث بأدب واحترام وروح أخوية، وتذكّر بالصلاة والأذكار،',
          'وتقدّم نصائح إيمانية وروحية رقيقة كصديق صالح. لا تُصدر فتاوى،',
          'وعند الأسئلة الشرعية المختلف فيها، وجّه المستخدم لسؤال أهل العلم الموثوقين.',
          'احرص على الإيجاز واللطف، وراعِ سياق المستخدم ووقته ومزاجه إن وُجد.',
          `معلومات الملف الشخصي (اختياري): ${JSON.stringify(userProfile)}`,
          `سياق المساعد: ${JSON.stringify(assistantContext)}`,
          'عند التذكير: كن لطيفًا وواقعيًا، وقدّم أذكارًا موجزة أو آيات مناسبة دون إطالة.',
          'عند ملاحظة فتور أو انشغال: اقترح أعمالًا يسيرة (تسبيح، استغفار، دعاء قصير).'
        ].join('\n')
      }]
    };

    const body = {
      contents: [systemInstruction, ...contents],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 512
      }
    };

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    const r = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ error: 'Upstream error', details: text });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text, raw: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err?.message || err) });
  }
});

// Fallback to index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
});
