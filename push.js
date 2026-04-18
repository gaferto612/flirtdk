const webpush = require('web-push');
const db       = require('../db');

// VAPID-nøgler genereres én gang og gemmes i miljøvariabler.
// Kør: node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"
webpush.setVapidDetails(
  `mailto:${process.env.SMTP_USER || 'admin@flirtdk.dk'}`,
  process.env.VAPID_PUBLIC  || '',
  process.env.VAPID_PRIVATE || ''
);

// ── Send push til én bruger ─────────────────────────────────────────────────
async function pushToUser(userId, payload) {
  const subs = db.prepare(
    'SELECT * FROM push_subscriptions WHERE user_id = ?'
  ).all(userId);

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      // Fjern ugyldige subscriptions (bruger har slået notifikationer fra)
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
          .run(sub.endpoint);
      }
    }
  }
}

// ── Notifikations-typer ──────────────────────────────────────────────────────
function notifyNewMessage(toUserId, fromName) {
  return pushToUser(toUserId, {
    title: `Ny besked fra ${fromName} 💬`,
    body:  'Klik for at læse og svare',
    icon:  '/icon-192.png',
    url:   '/messages',
  });
}

function notifyLike(toUserId, fromName) {
  return pushToUser(toUserId, {
    title: `${fromName} har liket dig ❤️`,
    body:  'Se profilen og skriv tilbage',
    icon:  '/icon-192.png',
    url:   '/',
  });
}

function notifyMatch(toUserId, fromName) {
  return pushToUser(toUserId, {
    title: `🎉 Match med ${fromName}!`,
    body:  'I kan nu skrive frit til hinanden',
    icon:  '/icon-192.png',
    url:   '/messages',
  });
}

module.exports = { pushToUser, notifyNewMessage, notifyLike, notifyMatch };
