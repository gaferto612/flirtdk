const router      = require('express').Router();
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { sendPremiumReceipt } = require('../services/email');

// Stripe initialiseres kun hvis API-nøgle er sat
const stripe = process.env.STRIPE_SECRET
  ? require('stripe')(process.env.STRIPE_SECRET)
  : null;

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// ── Priser (oprettes i dit Stripe-dashboard) ────────────────────────────────
// Tilføj dine egne Price-IDs fra Stripe Dashboard → Products
const PLANS = {
  monthly: {
    label:   '1 måned',
    priceId: process.env.STRIPE_PRICE_MONTHLY || 'price_xxxx_monthly',
    days:    30,
  },
  halfyear: {
    label:   '6 måneder',
    priceId: process.env.STRIPE_PRICE_HALFYEAR || 'price_xxxx_halfyear',
    days:    180,
  },
  yearly: {
    label:   '1 år',
    priceId: process.env.STRIPE_PRICE_YEARLY || 'price_xxxx_yearly',
    days:    365,
  },
};

// ── GET /api/payments/plans ─────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  return res.json(Object.entries(PLANS).map(([key, p]) => ({
    key, label: p.label, days: p.days,
  })));
});

// ── POST /api/payments/checkout ─────────────────────────────────────────────
router.post('/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Betalingssystem ikke konfigureret' });

  const { plan } = req.body;
  const chosen   = PLANS[plan];
  if (!chosen) return res.status(400).json({ error: 'Ukendt plan' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  // Hent eller opret Stripe-kunde
  let customerId = user.stripe_customer;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    user.email,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    db.prepare('UPDATE users SET stripe_customer = ? WHERE id = ?').run(customerId, user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       'payment',
    line_items: [{ price: chosen.priceId, quantity: 1 }],
    success_url: `${BASE}/api/payments/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
    cancel_url:  `${BASE}/?payment=cancelled`,
    metadata: {
      userId: String(user.id),
      plan,
    },
  });

  return res.json({ url: session.url });
});

// ── GET /api/payments/success ────────────────────────────────────────────────
// Stripe redirecter hertil efter betaling
router.get('/success', requireAuth, async (req, res) => {
  if (!stripe) return res.redirect('/?payment=error');

  const { session_id, plan } = req.query;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') return res.redirect('/?payment=failed');

    const chosen  = PLANS[plan];
    const until   = new Date(Date.now() + chosen.days * 86400000).toISOString();
    const user    = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    db.prepare('UPDATE users SET premium = 1, premium_until = ? WHERE id = ?')
      .run(until, req.user.id);

    try { await sendPremiumReceipt(user.email, user.username, chosen.label); } catch {}

    return res.redirect('/?payment=success');
  } catch (err) {
    console.error('Stripe success fejl:', err);
    return res.redirect('/?payment=error');
  }
});

// ── POST /api/payments/webhook ───────────────────────────────────────────────
// Stripe webhook — kræver raw body (sat op i server.js)
router.post('/webhook', (req, res) => {
  if (!stripe) return res.status(503).end();

  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    console.error('Webhook fejl:', err.message);
    return res.status(400).send(`Webhook fejl: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const userId  = parseInt(session.metadata.userId);
      const plan    = PLANS[session.metadata.plan];
      if (plan && userId) {
        const until = new Date(Date.now() + plan.days * 86400000).toISOString();
        db.prepare('UPDATE users SET premium = 1, premium_until = ? WHERE id = ?')
          .run(until, userId);
      }
    }
  }

  return res.json({ received: true });
});

// ── GET /api/payments/status ────────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
  const user = db.prepare('SELECT premium, premium_until FROM users WHERE id = ?')
    .get(req.user.id);
  const active = user.premium === 1 && user.premium_until != null && new Date(user.premium_until) > new Date();
  return res.json({ premium: active, until: user.premium_until });
});

module.exports = router;
