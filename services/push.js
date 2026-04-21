const db = require('../db');

let webpush = null;
if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
  try {
    webpush = require('web-push');
    webpush.setVapidDetails(
      `mailto:admin@flirtdk.dk`,
      process.env.VAPID_PUBLIC.replace(/=/g, ''),
      process.env.VAPID_PRIVATE.replace(/=/g, '')
    );
  } catch (e) {
    console.warn('Push-notifikationer deaktiveret:', e.message);
    webpush = null;
  }
}

async function pushToUser(userId, payload) {
  if (!webpush) return;
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
      }
    }
  }
}

function notifyNewMessage(toUserId, fromName) {
  return pushToUser(toUserId, { title: `Ny besked fra ${fromName} 💬`, body: 'Klik for at læse', url: '/messages' });
}
function notifyLike(toUserId, fromName) {
  return pushToUser(toUserId, { title: `${fromName} har liket dig ❤️`, body: 'Se profilen', url: '/' });
}
function notifyMatch(toUserId, fromName) {
  return pushToUser(toUserId, { title: `🎉 Match med ${fromName}!`, body: 'Skriv til hinanden', url: '/messages' });
}

module.exports = { pushToUser, notifyNewMessage, notifyLike, notifyMatch };
