// Basic SPA tab handling
const tabs = document.querySelectorAll('.tabs button');
const sections = document.querySelectorAll('.tab');
const goLinks = document.querySelectorAll('[data-go]');

function activateTab(id) {
  tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  sections.forEach(s => s.classList.toggle('active', s.id === id));
  history.replaceState({}, '', `#${id}`);
}

tabs.forEach(b => b.addEventListener('click', () => activateTab(b.dataset.tab)));
goLinks.forEach(a => a.addEventListener('click', () => activateTab(a.dataset.go)));
if (location.hash) activateTab(location.hash.slice(1));

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem('theme', cur);
});

// Notification test
document.getElementById('notifyTest').addEventListener('click', async () => {
  if (!('Notification' in window)) return alert('المتصفح لا يدعم الإشعارات');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return alert('يرجى السماح بالإشعارات');
  new Notification('تذكرة طيبة', { body: 'اذكر الله — سبحان الله وبحمده 🌿' });
});

// Register service worker for PWA/notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Google Sign-In (GIS) — One Tap/Button init
const auth = { user: null };
const googleBtn = document.getElementById('googleBtn');
const userChip = document.getElementById('userChip');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

async function loadMe() {
  const r = await fetch('/api/auth/me', { credentials: 'include' });
  if (r.ok && r.status !== 204) {
    const { user } = await r.json();
    if (user) { setUser(user); return; }
  }
  clearUser();
}
function setUser(user) {
  auth.user = user;
  googleBtn.style.display = 'none';
  userChip.hidden = false;
  userAvatar.src = user.picture || '';
  userName.textContent = user.name || '';
}
function clearUser() {
  auth.user = null;
  googleBtn.style.display = '';
  userChip.hidden = true;
}

async function initGoogle() {
  let clientId = '';
  try {
    const conf = await fetch('/api/config').then(r => r.json()).catch(() => ({}));
    clientId = conf.googleClientId || '';
    if (!clientId) return; // not configured yet
  } catch { return; }
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  }).catch(() => {});
  if (!(window.google && window.google.accounts && window.google.accounts.id)) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: async (resp) => {
      try {
        const r = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ credential: resp.credential })
        });
        if (r.ok) {
          const data = await r.json();
          setUser(data.user);
        }
      } catch {}
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: 'popup'
  });
  window.google.accounts.id.renderButton(googleBtn, { theme: 'outline', size: 'medium', shape: 'pill', text: 'continue_with' });
  window.google.accounts.id.prompt();
}
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  clearUser();
});
loadMe();
initGoogle();

// Quran reading — minimal sample data
const SURAH_NAMES = [
  'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'
];

const FATIHA_AYAT = [
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  'الرَّحْمَٰنِ الرَّحِيمِ',
  'مَالِكِ يَوْمِ الدِّينِ',
  'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
  'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ'
];

const surahSelect = document.getElementById('surahSelect');
const quranText = document.getElementById('quranText');
const fontSize = document.getElementById('fontSize');
SURAH_NAMES.forEach((n, i) => {
  const opt = document.createElement('option');
  opt.value = String(i + 1);
  opt.textContent = `${i + 1}. ${n}`;
  surahSelect.appendChild(opt);
});
surahSelect.value = '1';

function renderSurah(num) {
  // Demo: render Al-Fatiha locally; others placeholder
  quranText.style.fontSize = fontSize.value + 'px';
  if (String(num) === '1') {
    quranText.innerHTML = FATIHA_AYAT.map((a, i) => `<span class="ayah">${a}<span class="num">﴿${i + 1}﴾</span></span>`).join(' ');
  } else {
    quranText.innerHTML = `<div class="hint">سيتم تحميل السورة عند الاتصال — (عرض تجريبي).</div>`;
  }
}
renderSurah(1);
surahSelect.addEventListener('change', e => renderSurah(e.target.value));
fontSize.addEventListener('input', () => renderSurah(surahSelect.value));

// Quran audio — simple sources map (placeholders)
const RECITERS = [
  { id: 'abdul_baset', name: 'عبد الباسط (مجود)', base: 'https://download.quranicaudio.com/qdc/abdul_baset/mujawwad' },
  { id: 'mishary', name: 'مشاري العفاسي', base: 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal' },
];
const reciterSelect = document.getElementById('reciterSelect');
const surahAudioSelect = document.getElementById('surahAudioSelect');
const player = document.getElementById('player');
const playBtn = document.getElementById('playBtn');
RECITERS.forEach(r => {
  const opt = document.createElement('option');
  opt.value = r.id; opt.textContent = r.name; reciterSelect.appendChild(opt);
});
SURAH_NAMES.forEach((n, i) => {
  const opt = document.createElement('option');
  opt.value = String(i + 1); opt.textContent = `${i + 1}. ${n}`; surahAudioSelect.appendChild(opt);
});
reciterSelect.value = RECITERS[0].id; surahAudioSelect.value = '1';
function pad3(n) { return String(n).padStart(3, '0'); }
function currentReciter() { return RECITERS.find(r => r.id === reciterSelect.value) || RECITERS[0]; }
playBtn.addEventListener('click', () => {
  const src = `${currentReciter().base}/${pad3(surahAudioSelect.value)}.mp3`;
  player.src = src; player.play().catch(() => {});
});

// Hadith — sample dataset + search
const HADITH = [
  { ref: 'البخاري 1', text: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ...' },
  { ref: 'مسلم 2699', text: 'لا تَحَاسَدُوا ولا تَنَاجَشُوا...' },
  { ref: 'الترمذي 2516', text: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ...' },
];
const hadithList = document.getElementById('hadithList');
const hadithSearch = document.getElementById('hadithSearch');
function renderHadith(filter = '') {
  const q = filter.trim();
  hadithList.innerHTML = '';
  HADITH.filter(h => !q || h.text.includes(q) || h.ref.includes(q)).forEach(h => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${h.ref}</strong><div>${h.text}</div>`;
    hadithList.appendChild(li);
  });
}
renderHadith();
hadithSearch.addEventListener('input', () => renderHadith(hadithSearch.value));

// Calendar — Hijri today + Ramadan countdown
const hijriToday = document.getElementById('hijriToday');
const gregToday = document.getElementById('gregToday');
const ramadanCountdown = document.getElementById('ramadanCountdown');

function formatHijri(date) {
  const f = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { dateStyle: 'full' });
  return f.format(date);
}
function formatGreg(date) {
  const f = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full' });
  return f.format(date);
}
function getHijriParts(date) {
  const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const toNumber = s => Number(s.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 1632)));
  return { day: toNumber(map.day), month: toNumber(map.month), year: toNumber(map.year) };
}
function nextRamadanStart(from = new Date()) {
  const start = new Date(from);
  for (let i = 0; i < 420; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const { day, month } = getHijriParts(d);
    if (month === 9 && day === 1) return d;
  }
  // fallback ~ a year later
  const approx = new Date(from);
  approx.setDate(approx.getDate() + 355);
  return approx;
}
function updateToday() {
  const now = new Date();
  hijriToday.textContent = formatHijri(now);
  gregToday.textContent = formatGreg(now);
}
function updateCountdown() {
  const target = nextRamadanStart(new Date());
  const diff = target - new Date();
  if (diff <= 0) return (ramadanCountdown.textContent = 'رمضان مبارك!');
  const d = Math.floor(diff / (24 * 3600 * 1000));
  const h = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const m = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  const s = Math.floor((diff % (60 * 1000)) / 1000);
  ramadanCountdown.textContent = `${d} يوم ${h} ساعة ${m} دقيقة ${s} ثانية`;
}
updateToday();
setInterval(updateCountdown, 1000);
updateCountdown();

// Prayer times — placeholder estimation
const locateBtn = document.getElementById('locateBtn');
const prayerTimesEl = document.getElementById('prayerTimes');
function approxPrayerTimes(lat, lon, date = new Date()) {
  // Placeholder times (NOT accurate). Integrate adhan.js for real calc.
  const base = new Date(date);
  base.setHours(5, 0, 0, 0);
  const fmt = new Intl.DateTimeFormat('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const entries = [
    ['الفجر', 0], ['الظهر', 7], ['العصر', 10], ['المغرب', 13], ['العشاء', 15]
  ].map(([name, addH]) => {
    const d = new Date(base.getTime() + addH * 3600 * 1000);
    return { name, time: fmt.format(d) };
  });
  return entries;
}
function renderPrayerTimes(list) {
  prayerTimesEl.innerHTML = '';
  list.forEach(i => {
    const li = document.createElement('li');
    li.textContent = `${i.name}: ${i.time}`;
    prayerTimesEl.appendChild(li);
  });
}
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return alert('المتصفح لا يدعم تحديد الموقع');
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const times = approxPrayerTimes(latitude, longitude, new Date());
    currentPrayerTimes = times;
    renderPrayerTimes(times);
    saveLocation({ lat: latitude, lon: longitude, at: Date.now() });
    updateLocationLabel({ lat: latitude, lon: longitude });
    schedulePrayerReminders(); ensureNotifyPerm();
  }, () => alert('تعذّر تحديد الموقع'));
});

// Tasbih — counter + points
const dhikrSelect = document.getElementById('dhikrSelect');
const dhikrLabel = document.getElementById('dhikrLabel');
const countEl = document.getElementById('count');
const pointsEl = document.getElementById('points');
const tapBtn = document.getElementById('tapBtn');
const resetBtn = document.getElementById('resetBtn');
let count = Number(localStorage.getItem('tasbih:count') || 0);
let points = Number(localStorage.getItem('points') || 0);
countEl.textContent = count; pointsEl.textContent = points;
dhikrSelect.addEventListener('change', () => (dhikrLabel.textContent = dhikrSelect.value));
tapBtn.addEventListener('click', () => {
  count += 1; points += 1; // simple gamification
  countEl.textContent = count; pointsEl.textContent = points;
  localStorage.setItem('tasbih:count', String(count));
  localStorage.setItem('points', String(points));
  if (navigator.vibrate) navigator.vibrate(10);
});
resetBtn.addEventListener('click', () => { count = 0; countEl.textContent = count; localStorage.setItem('tasbih:count', '0'); });

// Azkar — categories
const AZKAR = {
  morning: [
    'أصبحنا وأصبح الملك لله...',
    'اللهم بك أصبحنا وبك أمسينا...',
  ],
  evening: [
    'أمسينا وأمسى الملك لله...',
    'اللهم بك أمسينا وبك أصبحنا...',
  ],
  'after-prayer': [
    'أستغفر الله (3) — اللهم أنت السلام ومنك السلام...',
  ],
  sleep: [
    'باسمك ربي وضعت جنبي وبك أرفعه...',
  ]
};
const azkarList = document.getElementById('azkarList');
document.querySelectorAll('.azkar .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.azkar .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderAzkar(chip.dataset.cat);
  });
});
function renderAzkar(cat = 'morning') {
  azkarList.innerHTML = '';
  (AZKAR[cat] || []).forEach(t => {
    const li = document.createElement('li'); li.textContent = t; azkarList.appendChild(li);
  });
}
renderAzkar('morning');

// Assistant — chat UI
const chat = document.getElementById('chat');
const chatForm = document.getElementById('chatForm');
const chatText = document.getElementById('chatText');
const chatList = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');
const remPrayers = document.getElementById('remPrayers');
const remAzkar = document.getElementById('remAzkar');
const updateLocationBtn = document.getElementById('updateLocation');
const locLabel = document.getElementById('locLabel');
const nextPrayerEl = document.getElementById('nextPrayer');
const memoryNotes = document.getElementById('memoryNotes');
const saveMemory = document.getElementById('saveMemory');
const suggests = document.getElementById('suggests');

// Gemini (direct) constants — per your request
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = 'AIzaSyBNNqFB2z3o6Od8tqDEOiEGX-mXUwz0z-Y';

// State + storage
const store = {
  get(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Chats
function loadChats() { return store.get('assistant:chats', []); }
function saveChats(chats) { store.set('assistant:chats', chats); }
function activeChatId() { return localStorage.getItem('assistant:activeChatId'); }
function setActiveChatId(id) { localStorage.setItem('assistant:activeChatId', id); }
function createChat(title = 'محادثة جديدة') {
  const chats = loadChats();
  const c = { id: uid(), title, messages: [] };
  chats.unshift(c); saveChats(chats); setActiveChatId(c.id); renderChats(); renderChat(c);
}
function deleteChat(id) {
  const chats = loadChats().filter(c => c.id !== id); saveChats(chats);
  if (activeChatId() === id) setActiveChatId(chats[0]?.id || '');
  renderChats(); const ac = chats.find(c => c.id === activeChatId()); if (ac) renderChat(ac); else chat.innerHTML = '';
}
function renameChat(id, title) {
  const chats = loadChats(); const c = chats.find(x => x.id === id); if (c) c.title = title;
  saveChats(chats); renderChats();
}
function renderChats() {
  const chats = loadChats();
  const aid = activeChatId();
  chatList.innerHTML = '';
  chats.forEach(c => {
    const div = document.createElement('div');
    div.className = 'chat-item' + (aid === c.id ? ' active' : '');
    div.innerHTML = `<span class="title">${c.title}</span><span class="actions"><button title="إعادة تسمية">✎</button><button title="حذف">🗑️</button></span>`;
    div.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return; setActiveChatId(c.id); renderChats(); renderChat(c);
    });
    div.querySelectorAll('button')[0].addEventListener('click', (e) => {
      e.stopPropagation(); const t = prompt('عنوان المحادثة', c.title); if (t) renameChat(c.id, t);
    });
    div.querySelectorAll('button')[1].addEventListener('click', (e) => {
      e.stopPropagation(); if (confirm('حذف المحادثة؟')) deleteChat(c.id);
    });
    chatList.appendChild(div);
  });
}
function renderChat(c) {
  chat.innerHTML = '';
  if (!c.messages.length) appendMsg('bot', 'مرحبًا بك — أنا رفيقك الصالح. كيف حال قلبك اليوم؟');
  c.messages.forEach(m => appendMsg(m.role, m.content));
  chat.scrollTop = chat.scrollHeight;
}
function currentChat() {
  const chats = loadChats(); return chats.find(c => c.id === activeChatId()) || null;
}
function updateCurrentChatMessages(updater) {
  const chats = loadChats();
  const ic = chats.findIndex(c => c.id === activeChatId()); if (ic < 0) return;
  updater(chats[ic]); saveChats(chats);
}

function appendMsg(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function appendTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot typing';
  div.textContent = '...';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

// Memory and settings
function loadSettings() { return store.get('assistant:settings', { reminders: { prayers: true, azkar: false } }); }
function saveSettings(s) { store.set('assistant:settings', s); }
function loadMemory() { return store.get('assistant:memory', { notes: '' }); }
function saveMemoryObj(m) { store.set('assistant:memory', m); }

// Location
function loadLocation() { return store.get('location', null); }
function saveLocation(loc) { store.set('location', loc); }

// Init UI state
(function initAssistantUI() {
  // init chats
  if (!loadChats().length) createChat('أول محادثة');
  if (!activeChatId()) setActiveChatId(loadChats()[0].id);
  renderChats(); const ac = currentChat(); if (ac) renderChat(ac);
  // settings
  const s = loadSettings(); remPrayers.checked = !!s.reminders?.prayers; remAzkar.checked = !!s.reminders?.azkar;
  remPrayers.addEventListener('change', () => { const st = loadSettings(); st.reminders.prayers = remPrayers.checked; saveSettings(st); if (remPrayers.checked) ensureNotifyPerm(); });
  remAzkar.addEventListener('change', () => { const st = loadSettings(); st.reminders.azkar = remAzkar.checked; saveSettings(st); if (remAzkar.checked) ensureNotifyPerm(); });
  // memory
  memoryNotes.value = loadMemory().notes || '';
  saveMemory.addEventListener('click', () => { saveMemoryObj({ notes: memoryNotes.value }); alert('تم حفظ الذاكرة'); });
})();

newChatBtn.addEventListener('click', () => createChat('محادثة جديدة'));

// Assistant ask with context
async function askAI(text) {
  const c = currentChat(); if (!c) return;
  updateCurrentChatMessages(chat => chat.messages.push({ role: 'user', content: text }));
  appendMsg('user', text);
  const typingEl = appendTyping();
  try {
    const profile = JSON.parse(localStorage.getItem('profile') || '{}');
    const location = loadLocation();
    const context = buildAssistantContext();
    // Prefer direct Gemini call with embedded key; fallback to server proxy
    const textResp = await callGeminiDirect(currentChat().messages, { profile: { ...profile, location }, context });
    typingEl.classList.remove('typing');
    typingEl.textContent = textResp || '—';
    updateCurrentChatMessages(chat => chat.messages.push({ role: 'assistant', content: textResp || '' }));
  } catch (e) {
    try {
      const profile = JSON.parse(localStorage.getItem('profile') || '{}');
      const location = loadLocation();
      const context = buildAssistantContext();
      const r2 = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentChat().messages, userProfile: { ...profile, location }, assistantContext: context })
      });
      const data2 = await r2.json();
      typingEl.classList.remove('typing');
      typingEl.textContent = data2.text || '—';
      updateCurrentChatMessages(chat => chat.messages.push({ role: 'assistant', content: data2.text || '' }));
    } catch {
      typingEl.classList.remove('typing');
      typingEl.textContent = 'تعذّر الاتصال بالمساعد حالياً.';
    }
  }
}
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const txt = chatText.value.trim();
  if (!txt) return;
  chatText.value = '';
  askAI(txt);
});

// Quick suggestions
if (suggests) {
  suggests.querySelectorAll('[data-suggest]').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.getAttribute('data-suggest');
      chatText.value = v; chatText.focus();
    });
  });
}

// Direct Gemini helper
async function callGeminiDirect(messages, meta) {
  const system = [
    'أنت مساعد ذكي داخل تطبيق إسلامي شامل، تطوّره seven_code7 بقيادة ليث وبالله.',
    'تتحدث بأدب واحترام وروح أخوية، وتذكّر بالصلاة والأذكار،',
    'وتقدّم نصائح إيمانية وروحية رقيقة كصديق صالح. لا تُصدر فتاوى،',
    'وعند الأسئلة الشرعية المختلف فيها، وجّه المستخدم لسؤال أهل العلم الموثوقين.',
    'احرص على الإيجاز واللطف، وراعِ سياق المستخدم ووقته ومزاجه إن وُجد.',
    `سياق: ${JSON.stringify(meta)}`
  ].join('\n');
  const contents = [
    { role: 'user', parts: [{ text: system }] },
    ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }))
  ];
  const body = { contents, generationConfig: { temperature: 0.6, topP: 0.9, topK: 40, maxOutputTokens: 512 } };
  const r = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await r.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Notifications and reminders
async function ensureNotifyPerm() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  try { await Notification.requestPermission(); } catch {}
}

// Track next prayer and remind
let nextPrayerInfo = { name: null, at: null };
function buildAssistantContext() {
  const now = new Date();
  const memory = loadMemory();
  const settings = loadSettings();
  const location = loadLocation();
  const times = currentPrayerTimes || [];
  const next = calcNextPrayer(times, now);
  return {
    now: now.toISOString(),
    settings, memory, location,
    nextPrayer: next || null,
    streakPoints: Number(localStorage.getItem('points') || 0),
  };
}

function calcNextPrayer(times, now = new Date()) {
  let upcoming = null;
  for (const t of times) {
    const dt = parseToTodayDate(t.time, now);
    if (dt > now) { upcoming = { name: t.name, time: dt.toISOString() }; break; }
  }
  return upcoming;
}
function parseToTodayDate(hhmm, ref = new Date()) {
  const [h, m] = hhmm.split(':').map(n => parseInt(n.replace(/[^\d]/g, ''), 10));
  const d = new Date(ref); d.setHours(h, m, 0, 0); return d;
}

let currentPrayerTimes = [];
function schedulePrayerReminders() {
  const s = loadSettings(); if (!s.reminders?.prayers) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const next = calcNextPrayer(currentPrayerTimes, now);
  nextPrayerInfo = next || { name: null, at: null };
  if (next) nextPrayerEl.textContent = `${next.name} — ${new Date(next.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;

  // Simple check loop
  if (window.__prayTimer) clearInterval(window.__prayTimer);
  window.__prayTimer = setInterval(() => {
    const s2 = loadSettings(); if (!s2.reminders?.prayers) return;
    const now = new Date();
    const next2 = calcNextPrayer(currentPrayerTimes, now);
    nextPrayerInfo = next2 || { name: null, at: null };
    if (next2) nextPrayerEl.textContent = `${next2.name} — ${new Date(next2.time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;
    const lastKey = 'assistant:lastPrayerReminder';
    const lastStr = localStorage.getItem(lastKey);
    const last = lastStr ? new Date(lastStr) : null;
    // Remind when within 0 minutes past time (edge within 30s)
    if (next2) {
      const t = new Date(next2.time);
      if (now >= t && now - t < 30000) {
        if (!last || now - last > 60000) {
          new Notification('حان وقت الصلاة', { body: `حان وقت ${next2.name}. أسأل الله لك القبول.` });
          localStorage.setItem(lastKey, new Date().toISOString());
        }
      }
    }
  }, 5000);
}

// Location capture and prayer times refresh
function updateLocationLabel(loc) {
  locLabel.textContent = loc ? `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}` : 'غير معروف';
}
async function captureLocation() {
  if (!navigator.geolocation) return alert('المتصفح لا يدعم تحديد الموقع');
  navigator.geolocation.getCurrentPosition(pos => {
    const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, at: Date.now() };
    saveLocation(loc); updateLocationLabel(loc);
    const times = approxPrayerTimes(loc.lat, loc.lon, new Date());
    currentPrayerTimes = times; renderPrayerTimes(times);
    schedulePrayerReminders();
  }, () => alert('تعذّر تحديد الموقع'));
}
updateLocationBtn.addEventListener('click', captureLocation);

// Initialize location from storage
const storedLoc = loadLocation(); updateLocationLabel(storedLoc);
if (storedLoc) { currentPrayerTimes = approxPrayerTimes(storedLoc.lat, storedLoc.lon, new Date()); schedulePrayerReminders(); }

// Profile — simple storage and activity badge
const profileName = document.getElementById('profileName');
const saveProfile = document.getElementById('saveProfile');
const activityLevel = document.getElementById('activityLevel');
const totalPoints = document.getElementById('totalPoints');
function loadProfile() {
  const p = JSON.parse(localStorage.getItem('profile') || '{}');
  profileName.value = p.name || '';
  totalPoints.textContent = localStorage.getItem('points') || '0';
  const pt = Number(localStorage.getItem('points') || 0);
  activityLevel.textContent = pt > 300 ? 'متمرس' : pt > 100 ? 'متقدم' : 'مبتدئ';
}
loadProfile();
saveProfile.addEventListener('click', () => {
  const p = { name: profileName.value.trim() };
  localStorage.setItem('profile', JSON.stringify(p));
  alert('تم حفظ الملف الشخصي');
});

// FAB opens assistant
document.getElementById('fabAssistant').addEventListener('click', () => activateTab('assistant'));
