// ============================================
// Balentine Tech Solutions - Portfolio Backend
// Express API Server
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// Allow requests from your portfolio frontend
app.use(cors({
    origin: [
        'https://d37rmtxeon9qnl.cloudfront.net',   // AWS CloudFront
        'https://debalent.github.io',               // GitHub Pages
        'http://localhost:3000',                    // Local development
        'http://127.0.0.1:5500'                     // VS Code Live Server
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

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

    // Build the email to send to yourself
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'BalentineTechSolutions@gmail.com',
        subject: `New Portfolio Inquiry: ${project} from ${name}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Project Type:</strong> ${project}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
        `
    };

    // Auto-reply to the person who submitted the form
    const autoReply = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Thanks for reaching out, ${name}!`,
        html: `
            <h2>Thanks for reaching out!</h2>
            <p>Hi ${name},</p>
            <p>I received your message about <strong>${project}</strong> and will get back to you within 24-48 hours.</p>
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
// START SERVER
// ============================================
app.listen(PORT, () => {
    console.log(`Balentine Tech Solutions API running on port ${PORT}`);
});

module.exports = app;
