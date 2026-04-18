# FlirtDK 🔥

Dansk dating-platform med Node.js backend + SQLite database.

---

## 🚀 Deploy på Railway (anbefalet)

### Trin 1 – Opret GitHub repo
1. Gå til [github.com](https://github.com) og opret en konto (gratis)
2. Opret et nyt repository (f.eks. `flirtdk`)
3. Upload alle filerne fra dette projekt

### Trin 2 – Forbind til Railway
1. Gå til [railway.app](https://railway.app) og log ind med GitHub
2. Klik **"New Project"** → **"Deploy from GitHub repo"**
3. Vælg dit `flirtdk` repository
4. Railway registrerer automatisk Node.js og starter serveren

### Trin 3 – Tilføj miljøvariabel
1. I Railway: gå til **Variables**
2. Tilføj: `JWT_SECRET` = (en lang tilfældig tekst, f.eks. `m1n-h3mmel1ge-n0gle-2025-xkq92`)
3. Klik **Deploy**

### Trin 4 – Få din URL
1. Under **Settings** → **Domains** → klik **"Generate Domain"**
2. Din side er nu live på f.eks. `https://flirtdk-xyz.up.railway.app`

---

## 💻 Kør lokalt (test på din computer)

```bash
# 1. Installér Node.js fra nodejs.org

# 2. Gå til projektmappen
cd flirtdk

# 3. Installér pakker
npm install

# 4. Kopiér miljøvariabel-filen
cp .env.example .env

# 5. Start serveren
npm start
# → Åbn http://localhost:3000
```

---

## 📁 Projektstruktur

```
flirtdk/
├── server.js           ← Indgangspunkt
├── db.js               ← Database-opsætning (SQLite)
├── package.json
├── .env.example        ← Kopiér til .env
├── routes/
│   ├── auth.js         ← Register, login, me
│   ├── profiles.js     ← Søg, rediger, like, foto
│   └── messages.js     ← Inbox, chat, send
├── middleware/
│   └── auth.js         ← JWT-tjek
└── public/
    ├── index.html      ← Frontend (hele hjemmesiden)
    └── uploads/        ← Profilbilleder gemmes her
```

---

## 🔌 API-oversigt

| Metode | Sti | Beskrivelse |
|--------|-----|-------------|
| POST | `/api/auth/register` | Opret bruger |
| POST | `/api/auth/login` | Log ind |
| GET  | `/api/auth/me` | Min brugerinfo |
| GET  | `/api/profiles` | Søg profiler |
| PUT  | `/api/profiles/me` | Opdater profil |
| POST | `/api/profiles/me/photo` | Upload billede |
| POST | `/api/profiles/:id/like` | Like en profil |
| GET  | `/api/messages/inbox` | Alle samtaler |
| GET  | `/api/messages/:id` | Samtale med bruger |
| POST | `/api/messages/:id` | Send besked |

---

## ⚠️ Vigtigt inden launch

- [ ] Skift `JWT_SECRET` til noget hemmeligt og langt
- [ ] Tilføj aldersvericifikation (18+ krav)
- [ ] Læs op på GDPR og cookie-regler
- [ ] Overvej at tilføje e-mail verifikation

---

Bygget med ❤️ og Node.js
