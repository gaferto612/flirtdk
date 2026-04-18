const nodemailer = require('nodemailer');

// Opret transporter én gang
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || `"FlirtDK" <${process.env.SMTP_USER}>`;
const BASE = process.env.BASE_URL  || 'http://localhost:3000';

// ── Send verifikationse-mail ─────────────────────────────────────────────────
async function sendVerification(email, token) {
  const url = `${BASE}/api/auth/verify?token=${token}`;
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: 'Bekræft din FlirtDK-konto',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#C0392B;">Velkommen til FlirtDK! 🔥</h2>
        <p>Klik på knappen herunder for at bekræfte din e-mail-adresse:</p>
        <a href="${url}"
           style="display:inline-block;background:#C0392B;color:#fff;padding:12px 28px;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Bekræft e-mail
        </a>
        <p style="color:#888;font-size:13px;">Linket udløber om 24 timer.<br>
          Hvis du ikke oprettede en konto, kan du ignorere denne e-mail.</p>
      </div>`,
  });
}

// ── Send besked-notifikation ─────────────────────────────────────────────────
async function sendMessageNotification(toEmail, fromName) {
  await transporter.sendMail({
    from:    FROM,
    to:      toEmail,
    subject: `${fromName} har sendt dig en besked på FlirtDK`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#C0392B;">Du har en ny besked! ✉️</h2>
        <p><strong>${fromName}</strong> har sendt dig en besked på FlirtDK.</p>
        <a href="${BASE}"
           style="display:inline-block;background:#C0392B;color:#fff;padding:12px 28px;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Læs beskeden
        </a>
      </div>`,
  });
}

// ── Send premium-kvittering ──────────────────────────────────────────────────
async function sendPremiumReceipt(email, username, plan) {
  await transporter.sendMail({
    from:    FROM,
    to:      email,
    subject: 'Velkommen som Premium-medlem på FlirtDK! ⭐',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#D4A853;">Du er nu Premium-medlem! ⭐</h2>
        <p>Hej ${username},</p>
        <p>Tak for dit køb. Din <strong>${plan}</strong>-abonnement er nu aktivt.</p>
        <ul style="color:#444;">
          <li>Ubegrænsede beskeder</li>
          <li>Se hvem der har liket dig</li>
          <li>Fremhævet profil i søgeresultater</li>
          <li>Ingen reklamer</li>
        </ul>
        <a href="${BASE}"
           style="display:inline-block;background:#C0392B;color:#fff;padding:12px 28px;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Gå til FlirtDK
        </a>
      </div>`,
  });
}

module.exports = { sendVerification, sendMessageNotification, sendPremiumReceipt };
