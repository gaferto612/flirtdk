'use strict';
const db    = require('./db');
const bcrypt = require('bcryptjs');
const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const BOTS = [
  {
    username: 'amalie_bot', email: 'amalie@flirtdk.bot',
    display_name: 'Amalie', age: 24, gender: 'kvinde', seeking: 'mand', city: 'København',
    bio: 'Spontan og nysgerrig pige fra Nørrebro. Elsker festivaler, gaderestauranter og alt for lange samtaler over en god vin. Skriv til mig hvis du tør 😊',
    photo: 'https://picsum.photos/seed/amalie24dk/400/600',
  },
  {
    username: 'rasmus_bot', email: 'rasmus@flirtdk.bot',
    display_name: 'Rasmus', age: 31, gender: 'mand', seeking: 'kvinde', city: 'Aarhus',
    bio: 'Afslappet fyr fra Aarhus med humor og overskud. IT om dagen, løbeture om morgenen og madlavning i weekenden. Leder efter en kvinde med spark i.',
    photo: 'https://picsum.photos/seed/rasmus31dk/400/600',
  },
  {
    username: 'sofie_bot', email: 'sofie@flirtdk.bot',
    display_name: 'Sofie', age: 27, gender: 'kvinde', seeking: 'mand', city: 'Odense',
    bio: 'Glad og åben pige fra Odense. Yoga, rejser og gode koncerter er mine store passioner. Kan lide at tage tingene som de kommer 🌸',
    photo: 'https://picsum.photos/seed/sofie27dk/400/600',
  },
  {
    username: 'nicolaj_bot', email: 'nicolaj@flirtdk.bot',
    display_name: 'Nicolaj', age: 38, gender: 'mand', seeking: 'kvinde', city: 'København',
    bio: 'Selvsikker og direkte mand fra Østerbro. God vin, motorcykelture og rejser til varme lande. Søger en kvinde der ved hvad hun vil have.',
    photo: 'https://picsum.photos/seed/nicolaj38dk/400/600',
  },
  {
    username: 'emma_bot', email: 'emma@flirtdk.bot',
    display_name: 'Emma', age: 22, gender: 'kvinde', seeking: 'alle', city: 'Aalborg',
    bio: 'Ung, energisk og åben for det meste. Studerer i Aalborg og søger nye oplevelser og spændende mennesker at dele dem med. DM mig 🔥',
    photo: 'https://picsum.photos/seed/emma22dk/400/600',
  },
  {
    username: 'christian_bot', email: 'christian@flirtdk.bot',
    display_name: 'Christian', age: 26, gender: 'mand', seeking: 'kvinde', city: 'Roskilde',
    bio: 'Kreativ og musikalsk fyr fra Roskilde. Spiller guitar, laver hjemmebagt brød og elsker spontane roadtrips. Søger en pige man kan grine med.',
    photo: 'https://picsum.photos/seed/christian26dk/400/600',
  },
  {
    username: 'camilla_bot', email: 'camilla@flirtdk.bot',
    display_name: 'Camilla', age: 33, gender: 'kvinde', seeking: 'mand', city: 'Vejle',
    bio: 'Varm og oprigtig kvinde fra Vejle. Naturelsker, hundemor og god til at lytte. Søger en mand der kan holde til en stærk kvinde 💋',
    photo: 'https://picsum.photos/seed/camilla33dk/400/600',
  },
  {
    username: 'mikkel_bot', email: 'mikkel@flirtdk.bot',
    display_name: 'Mikkel', age: 45, gender: 'mand', seeking: 'kvinde', city: 'Esbjerg',
    bio: 'Moden og jordbunden mand fra Esbjerg. Fisker, griller og nyder den enkle tilværelse. Søger en kvinde til gode stunder og hygge.',
    photo: 'https://picsum.photos/seed/mikkel45dk/400/600',
  },
  {
    username: 'ida_bot', email: 'ida@flirtdk.bot',
    display_name: 'Ida', age: 29, gender: 'kvinde', seeking: 'mand', city: 'Aarhus',
    bio: 'Sjov og direkte pige fra Aarhus med masser af energi. Street food, biograf og danse til det bliver morgen. Er du klar til at holde trit? 😉',
    photo: 'https://picsum.photos/seed/ida29dk/400/600',
  },
  {
    username: 'karenbo_bot', email: 'karenbo@flirtdk.bot',
    display_name: 'Karen & Bo', age: 36, gender: 'par', seeking: 'mand', city: 'Fredericia',
    bio: 'Åbent og nysgerrigt par fra Fredericia. Vi søger en mand til uforpligtende og diskret sjov. Respektfulde og rare — skriv os en besked 💑',
    photo: 'https://picsum.photos/seed/karenbo36dk/400/600',
  },
];

// Download photo med redirect-understøttelse
function downloadPhoto(url, dest) {
  return new Promise((resolve) => {
    if (fs.existsSync(dest)) { resolve(true); return; }
    const file = fs.createWriteStream(dest);
    function get(u) {
      const mod = u.startsWith('https') ? https : http;
      mod.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.destroy();
          fs.unlink(dest, () => {});
          const loc = res.headers.location;
          const next = loc.startsWith('http') ? loc : new URL(loc, u).href;
          const file2 = fs.createWriteStream(dest);
          const mod2 = next.startsWith('https') ? https : http;
          mod2.get(next, (res2) => {
            res2.pipe(file2);
            file2.on('finish', () => { file2.close(); resolve(true); });
          }).on('error', () => { fs.unlink(dest, () => {}); resolve(false); });
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(true); });
      }).on('error', () => { fs.unlink(dest, () => {}); resolve(false); });
    }
    get(url);
  });
}

async function seedBots() {
  // Brug hurtig hash (kun bots — ingen rigtig login)
  const hash = await bcrypt.hash('flirtdk_bot_' + Date.now(), 4);

  for (const bot of BOTS) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(bot.email);
    if (exists) continue;

    const res = db.prepare(
      'INSERT INTO users (username, email, password, verified) VALUES (?, ?, ?, 1)'
    ).run(bot.username, bot.email, hash);
    const userId = res.lastInsertRowid;

    // Download og gem profilbillede
    const filename = `bot_${bot.username}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const ok = await downloadPhoto(bot.photo, filepath);
    const photoUrl = ok ? `/uploads/${filename}` : null;

    // Start med tilfældig online-status
    const online = Math.random() < 0.6 ? 1 : 0;

    db.prepare(`
      INSERT INTO profiles (user_id, display_name, age, gender, seeking, city, bio, photo, is_online, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, bot.display_name, bot.age, bot.gender, bot.seeking, bot.city, bot.bio, photoUrl, online);

    console.log(`Bot oprettet: ${bot.display_name} (${bot.city}) ${online ? '🟢' : '⚫'}`);
  }
}

function startBotActivity() {
  // Hvert bot har sin egen "aktivitetsrytme"
  const botSchedules = {};

  function tickBot(userId) {
    try {
      // Tilfældig online/offline — 50% chance online
      const online = Math.random() < 0.5 ? 1 : 0;
      db.prepare("UPDATE profiles SET is_online=?, last_seen=datetime('now') WHERE user_id=?")
        .run(online, userId);
    } catch {}

    // Næste skift: 3-12 minutter (tilfældig per bot)
    const next = (3 + Math.random() * 9) * 60 * 1000;
    botSchedules[userId] = setTimeout(() => tickBot(userId), next);
  }

  // Start alle bots med tilfældig forsinkelse så de ikke skifter samtidig
  try {
    const bots = db.prepare(
      "SELECT p.user_id FROM profiles p JOIN users u ON u.id = p.user_id WHERE u.email LIKE '%@flirtdk.bot'"
    ).all();

    for (const bot of bots) {
      // Start første tick på et tilfældigt tidspunkt inden for 5 min
      const delay = Math.random() * 5 * 60 * 1000;
      setTimeout(() => tickBot(bot.user_id), delay);
    }

    console.log(`Bot-aktivitet startet for ${bots.length} bots`);
  } catch (e) {
    console.warn('Kunne ikke starte bot-aktivitet:', e.message);
  }
}

module.exports = { seedBots, startBotActivity };
