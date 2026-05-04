// ============================================
// Balentine Tech Solutions - Portfolio Backend
// Express API Server
// ============================================

require('dotenv').config();
const crypto  = require('crypto');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');
const { Pool }   = require('pg');
const stripe     = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ============================================
// SECURITY HELPERS
// ============================================

// AES-256-GCM field-level encryption for PII stored in PostgreSQL.
// Set ENCRYPTION_KEY to a 64-char hex string (32 bytes) in .env:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const ENCRYPTION_ALGO = 'aes-256-gcm';
const _encKey = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : null;

if (!_encKey || _encKey.length !== 32) {
    console.warn('[security] ENCRYPTION_KEY missing or wrong length — PII will NOT be encrypted at rest.');
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns a colon-joined string: iv:authTag:ciphertext (all hex).
 * Falls back to plaintext if the key is unavailable.
 */
function encryptField(plaintext) {
    if (!_encKey) return plaintext;
    const iv      = crypto.randomBytes(12);  // 96-bit IV (recommended for GCM)
    const cipher  = crypto.createCipheriv(ENCRYPTION_ALGO, _encKey, iv);
    const enc     = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag     = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/**
 * Decrypts a value produced by encryptField.
 * Returns the plaintext, or the original value if it is not encrypted.
 */
function decryptField(value) {
    if (!_encKey || !value || !value.includes(':')) return value;
    try {
        const [ivHex, tagHex, dataHex] = value.split(':');
        const iv      = Buffer.from(ivHex,  'hex');
        const tag     = Buffer.from(tagHex, 'hex');
        const data    = Buffer.from(dataHex, 'hex');
        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, _encKey, iv);
        decipher.setAuthTag(tag);
        return decipher.update(data) + decipher.final('utf8');
    } catch {
        return value; // graceful degradation — return as-is if decryption fails
    }
}

/**
 * Escapes HTML special characters to prevent XSS injection in email templates.
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#x27;');
}

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// DATABASE — PostgreSQL connection pool (RDS)
// Connection params come from environment vars
// set via SSM Parameter Store on EC2
// ============================================
const pool = new Pool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME     || 'balentinetech',
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Run once at startup: create the projects table if it doesn't exist yet
async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id                  SERIAL PRIMARY KEY,
                stripe_session_id   VARCHAR(200) UNIQUE NOT NULL,
                stripe_customer_id  VARCHAR(200),
                stripe_sub_id       VARCHAR(200),
                customer_email      VARCHAR(300),
                plan                VARCHAR(100),
                status              VARCHAR(50) DEFAULT 'pending',
                created_at          TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id          SERIAL PRIMARY KEY,
                slug        VARCHAR(100) UNIQUE NOT NULL,
                title       VARCHAR(200) NOT NULL,
                description TEXT,
                tech        TEXT[],
                live_url    VARCHAR(500),
                github_url  VARCHAR(500),
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Seed initial rows only when the table is empty
        const { rowCount } = await pool.query('SELECT 1 FROM projects LIMIT 1');
        if (rowCount === 0) {
            await pool.query(`
                INSERT INTO projects (slug, title, description, tech, live_url, github_url) VALUES
                ('salonshop',    'SalonShop',    'All-in-one booking and payments platform for independent beauty professionals.',
                 ARRAY['React','Node.js','MongoDB','Stripe'],
                 'https://debalent.github.io/SalonShop/',
                 'https://github.com/Debalent/SalonShop#readme'),
                ('creatorsync',  'CreatorSync',  'Multi-tenant SaaS for content creators with subscription management and analytics.',
                 ARRAY['React','Node.js','Stripe','Docker'],
                 'https://debalent.github.io/CreatorSync/public/index.html',
                 'https://github.com/Debalent/CreatorSync#readme'),
                ('scoutvision',  'ScoutVision',  'AI-powered scouting and talent evaluation platform for coaches and recruiters.',
                 ARRAY['Next.js','TypeScript','AI/ML','Analytics'],
                 'https://debalent.github.io/ScoutVision-Production/',
                 'https://github.com/Debalent/ScoutVision-Production#readme')
                ON CONFLICT (slug) DO NOTHING;
            `);
        }
        console.log('Database initialised successfully');
    } catch (err) {
        // Non-fatal — API still works without a DB connection (graceful degradation)
        console.warn('Database init skipped (no DB connection):', err.message);
    }
}

initDb();

// ============================================
// MIDDLEWARE
// ============================================

// Trust the first proxy (AWS ELB / Elastic Beanstalk) so that
// rate limiting uses the real client IP instead of the load-balancer IP.
app.set('trust proxy', 1);

// Security headers — sets X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security (HSTS), Referrer-Policy, X-DNS-Prefetch-Control,
// X-Download-Options, X-Permitted-Cross-Domain-Policies, and removes
// X-Powered-By to avoid fingerprinting.
app.use(helmet({
    // HSTS: tell browsers to only connect over HTTPS for 1 year
    strictTransportSecurity: {
        maxAge: 31536000,       // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    },
    // This is a pure JSON API — no HTML pages are served, so a
    // restrictive CSP is safe and prevents any accidental script execution.
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            scriptSrc:  ["'none'"],
            styleSrc:   ["'none'"],
            imgSrc:     ["'none'"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
        },
    },
    // Prevent MIME-type sniffing
    noSniff: true,
    // Deny framing of API responses
    frameguard: { action: 'deny' },
    // Don't send the Referer header when navigating away
    referrerPolicy: { policy: 'no-referrer' },
}));

// Allow requests from your portfolio frontend
app.use(cors({
    origin: [
        'https://d3mlam2b9qbwyy.cloudfront.net',                                          // AWS CloudFront (live site — HTTPS)
        'http://localhost:3000',                                                         // Local development
        'http://localhost:3001',                                                         // Local development (alt port)
        'http://localhost:5173',                                                         // Vite dev server
        'http://127.0.0.1:5500',                                                         // VS Code Live Server
        // NOTE: the Elastic Beanstalk and S3 static website origins below use plain
        // http:// only for internal health-checks during development.
        // All public traffic is routed through CloudFront over HTTPS.
        'http://balentinetech-backend-env.eba-pmim6y3b.us-east-2.elasticbeanstalk.com',  // EB (internal)
        'http://balentinetech-solutions-frontend.s3-website-us-east-2.amazonaws.com',    // S3 (internal)
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Stripe webhooks require the raw body — mount BEFORE express.json()
app.post(
    '/api/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const sig = req.headers['stripe-signature'];
        let event;
        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        try {
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object;
                    await pool.query(
                        `UPDATE subscriptions
                         SET status = 'active',
                             stripe_customer_id = $1,
                             stripe_sub_id = $2
                         WHERE stripe_session_id = $3`,
                        [
                            session.customer,
                            session.subscription,
                            session.id,
                        ]
                    );
                    break;
                }
                case 'customer.subscription.deleted': {
                    const sub = event.data.object;
                    await pool.query(
                        `UPDATE subscriptions SET status = 'cancelled' WHERE stripe_sub_id = $1`,
                        [sub.id]
                    );
                    break;
                }
                default:
                    break;
            }
            res.json({ received: true });
        } catch (err) {
            console.error('Webhook handler error:', err.message);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }
);

// Limit request body to 10 KB to prevent large-payload DoS attacks
app.use(express.json({ limit: '10kb' }));

// Rate limiting for checkout endpoint (10 per 15 min per IP)
const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many checkout requests. Please try again later.' }
});

// Rate limiting to prevent spam on the contact form (max 5 requests per 15 min per IP)
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many messages sent. Please try again later.' }
});

// ============================================
// EMAIL TRANSPORTER (Nodemailer)
// Uses Gmail SMTP — set credentials in .env
// ============================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,   // BalentineTechSolutions@gmail.com
        pass: process.env.EMAIL_PASS    // Gmail App Password (not your regular password)
    }
});

// ============================================
// ROUTES
// ============================================

// Health check — confirms the server is running
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Balentine Tech Solutions API is running' });
});

// ============================================
// POST /api/contact
// Receives contact form submissions and emails them
// ============================================
app.post('/api/contact', contactLimiter, async (req, res) => {
    const { name, email, project, message } = req.body;

    // Basic input validation
    if (!name || !email || !project || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Escape all user-supplied fields before embedding in HTML to prevent
    // XSS / HTML-injection via email clients that render HTML.
    const safeName    = escapeHtml(name);
    const safeEmail   = escapeHtml(email);
    const safeProject = escapeHtml(project);
    const safeMessage = escapeHtml(message);

    // Build the email to send to yourself
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'BalentineTechSolutions@gmail.com',
        subject: `New Portfolio Inquiry: ${safeProject} from ${safeName}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Project Type:</strong> ${safeProject}</p>
            <p><strong>Message:</strong></p>
            <p>${safeMessage}</p>
        `
    };

    // Auto-reply to the person who submitted the form
    const autoReply = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Thanks for reaching out, ${safeName}!`,
        html: `
            <h2>Thanks for reaching out!</h2>
            <p>Hi ${safeName},</p>
            <p>I received your message about <strong>${safeProject}</strong> and will get back to you within 24-48 hours.</p>
            <p>— Demond Balentine Sr.<br>Balentine Tech Solutions</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        await transporter.sendMail(autoReply);
        res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
});

// ============================================
// POST /api/create-checkout-session
// Creates a Stripe Checkout session for a subscription plan.
// Body: { planId: 'starter' | 'pro', customerEmail?: string }
// Returns: { url } — redirect the browser to this URL.
//
// Pricing plans are driven by Stripe Price IDs stored in env vars:
//   STRIPE_PRICE_STARTER  — e.g. price_xxxxxxxxxxxxxxxx
//   STRIPE_PRICE_PRO      — e.g. price_xxxxxxxxxxxxxxxx
// Create these in your Stripe Dashboard → Products.
// ============================================
app.post('/api/create-checkout-session', checkoutLimiter, async (req, res) => {
    const { planId, customerEmail } = req.body;

    const priceMap = {
        starter: process.env.STRIPE_PRICE_STARTER,
        pro:     process.env.STRIPE_PRICE_PRO,
    };

    const priceId = priceMap[planId];
    if (!priceId) {
        return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    // Validate email format if provided
    if (customerEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            return res.status(400).json({ error: 'Invalid email address.' });
        }
    }

    try {
        const sessionParams = {
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${process.env.FRONTEND_URL}/#pricing`,
            payment_method_types: ['card'],
        };

        if (customerEmail) {
            sessionParams.customer_email = customerEmail;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        // Encrypt PII (customer email) before storing in the database.
        // Card numbers never reach this server — they go directly to Stripe's vault.
        const encryptedEmail = customerEmail ? encryptField(customerEmail) : null;

        // Record the pending subscription in the DB
        await pool.query(
            `INSERT INTO subscriptions (stripe_session_id, customer_email, plan, status)
             VALUES ($1, $2, $3, 'pending')
             ON CONFLICT (stripe_session_id) DO NOTHING`,
            [session.id, encryptedEmail, planId]
        ).catch((err) => console.warn('DB insert skipped:', err.message));

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err.message);
        res.status(500).json({ error: 'Could not create checkout session.' });
    }
});

// ============================================
// GET /api/projects
// Returns portfolio projects as JSON
// ============================================
app.get('/api/projects', (req, res) => {
    const projects = [
        {
            id: 'salonshop',
            title: 'SalonShop',
            description: 'All-in-one booking, payments, and growth platform built for independent beauty professionals.',
            tech: ['React', 'Node.js', 'MongoDB', 'Stripe'],
            liveUrl: 'https://debalent.github.io/SalonShop/',
            githubUrl: 'https://github.com/Debalent/SalonShop#readme',
            screenshots: ['assets/salonshop-1.jpg', 'assets/salonshop-2.jpg']
        },
        {
            id: 'creatorsync',
            title: 'CreatorSync',
            description: 'Multi-tenant SaaS platform for content creators with subscription management and analytics.',
            tech: ['React', 'Node.js', 'Stripe', 'Docker'],
            liveUrl: 'https://debalent.github.io/CreatorSync/public/index.html',
            githubUrl: 'https://github.com/Debalent/CreatorSync#readme',
            screenshots: ['assets/creatorsync-1.jpg', 'assets/creatorsync-2.jpg', 'assets/creatorsync-3.jpg', 'assets/creatorsync-4.jpg']
        },
        {
            id: 'scoutvision',
            title: 'ScoutVision',
            description: 'AI-powered scouting and talent evaluation platform for coaches and recruiters.',
            tech: ['Next.js', 'AI/ML', 'TypeScript', 'Analytics'],
            liveUrl: 'https://debalent.github.io/ScoutVision-Production/',
            githubUrl: 'https://github.com/Debalent/ScoutVision-Production#readme',
            screenshots: ['assets/scoutvision-1.jpg', 'assets/scoutvision-2.jpg', 'assets/scoutvision-3.jpg']
        }
    ];

    res.json({ projects });
});

// ============================================
// GET /api/about
// Returns about/profile info as JSON
// ============================================
app.get('/api/about', (req, res) => {
    res.json({
        name: 'Demond Balentine Sr.',
        title: 'Full-Stack Developer & Technical Founder',
        location: 'Tulsa, OK',
        email: 'BalentineTechSolutions@gmail.com',
        github: 'https://github.com/Debalent',
        linkedin: 'https://www.linkedin.com/in/demond-balentine-sr-481666a7/',
        graduating: 'July 2026',
        school: 'Atlas School'
    });
});

// ============================================
// GET /api/health/db
// Verifies live connectivity to RDS PostgreSQL
// ============================================
app.get('/api/health/db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS db_time');
        res.json({
            status: 'ok',
            db: 'connected',
            db_time: result.rows[0].db_time,
        });
    } catch (err) {
        res.status(503).json({
            status: 'error',
            db: 'unreachable',
            message: err.message,
        });
    }
});

// ============================================
// GET /api/projects/db
// Returns portfolio projects from RDS
// ============================================
app.get('/api/projects/db', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT slug, title, description, tech, live_url, github_url FROM projects ORDER BY id ASC'
        );
        res.json({ source: 'rds', projects: result.rows });
    } catch (err) {
        console.error('DB query error:', err.message);
        res.status(503).json({ error: 'Database unavailable. Try /api/projects for the static list.' });
    }
});

// ============================================
// HEYGEN — AI Marketing Video Integration
//
// All HeyGen calls are proxied through this backend so the API key
// never reaches the browser.
//
// Endpoints:
//   GET  /api/heygen/avatars           — list available avatars
//   GET  /api/heygen/voices            — list available voices
//   POST /api/heygen/generate-video    — submit a video generation job
//   GET  /api/heygen/video-status/:id  — poll a job for completion
// ============================================

const HEYGEN_BASE = 'https://api.heygen.com';

// Shared helper — makes an authenticated request to HeyGen
async function heygenFetch(path, options = {}) {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) throw new Error('HEYGEN_API_KEY is not configured.');

    const url = `${HEYGEN_BASE}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.message || data?.error || `HeyGen error ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
    }
    return data;
}

// Rate limiter for HeyGen routes (5 requests per minute per IP)
const heygenLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many HeyGen requests. Please wait a moment.' },
});

// GET /api/heygen/avatars
app.get('/api/heygen/avatars', heygenLimiter, async (_req, res) => {
    try {
        const data = await heygenFetch('/v2/avatars');
        res.json(data);
    } catch (err) {
        console.error('HeyGen avatars error:', err.message);
        res.status(err.status || 502).json({ error: err.message });
    }
});

// GET /api/heygen/voices
app.get('/api/heygen/voices', heygenLimiter, async (_req, res) => {
    try {
        const data = await heygenFetch('/v2/voices');
        res.json(data);
    } catch (err) {
        console.error('HeyGen voices error:', err.message);
        res.status(err.status || 502).json({ error: err.message });
    }
});

// POST /api/heygen/generate-video
// Body: { avatarId, voiceId, script, title? }
app.post('/api/heygen/generate-video', heygenLimiter, async (req, res) => {
    const { avatarId, voiceId, script, title } = req.body;

    if (!avatarId || !voiceId || !script) {
        return res.status(400).json({ error: 'avatarId, voiceId, and script are required.' });
    }
    if (typeof script !== 'string' || script.trim().length === 0) {
        return res.status(400).json({ error: 'script must be a non-empty string.' });
    }
    if (script.length > 1500) {
        return res.status(400).json({ error: 'script must be 1500 characters or fewer.' });
    }

    try {
        const payload = {
            video_inputs: [
                {
                    character: {
                        type: 'avatar',
                        avatar_id: avatarId,
                        avatar_style: 'normal',
                    },
                    voice: {
                        type: 'text',
                        input_text: script.trim(),
                        voice_id: voiceId,
                    },
                },
            ],
            dimension: { width: 1280, height: 720 },
            ...(title ? { title } : {}),
        };

        const data = await heygenFetch('/v2/video/generate', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        res.status(202).json(data);
    } catch (err) {
        console.error('HeyGen generate error:', err.message);
        res.status(err.status || 502).json({ error: err.message });
    }
});

// GET /api/heygen/video-status/:videoId
// Polls until the job is completed, processing, or failed.
app.get('/api/heygen/video-status/:videoId', heygenLimiter, async (req, res) => {
    const { videoId } = req.params;

    // Only allow safe characters in the ID to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) {
        return res.status(400).json({ error: 'Invalid video ID.' });
    }

    try {
        const data = await heygenFetch(`/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`);
        res.json(data);
    } catch (err) {
        console.error('HeyGen status error:', err.message);
        res.status(err.status || 502).json({ error: err.message });
    }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`Balentine Tech Solutions API running on port ${PORT}`);
});

module.exports = app;
