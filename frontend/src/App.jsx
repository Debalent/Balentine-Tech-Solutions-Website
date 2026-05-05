import React, { useState, useEffect } from 'react';

// Backend API base URL — injected at Docker build time via VITE_API_URL arg
const API_BASE = import.meta.env.VITE_API_URL || '';

// ─────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <a href="#hero" className="nav__logo">
        <img src="/assets/logo.jpg" alt="Balentine Tech Solutions" className="nav__logo-img" />
      </a>
      <ul className="nav__links">
        {['Projects', 'About', 'Services', 'Videos', 'Pricing', 'Contact'].map((label) => (
          <li key={label}>
            <a href={`#${label.toLowerCase()}`} className="nav__link">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="hero" className="hero">
      <div className="hero__content">
        <p className="hero__eyebrow">Full-Stack Developer &amp; Cloud Architect</p>
        <h1 className="hero__headline">
          Building scalable products <span className="accent">that ship.</span>
        </h1>
        <p className="hero__sub">
          From SaaS platforms to cloud-native APIs — I design, build, and deploy
          software that solves real problems at scale.
        </p>
        <div className="hero__cta">
          <a href="#projects" className="btn btn--primary">View Projects</a>
          <a href="#contact" className="btn btn--outline">Get In Touch</a>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Projects — fetched from backend API
// ─────────────────────────────────────────────────────────────
function ScreenshotCarousel({ title, screenshots }) {
  const [idx, setIdx] = useState(0);
  if (!screenshots || screenshots.length === 0) return null;
  const prev = (e) => { e.preventDefault(); setIdx((i) => (i - 1 + screenshots.length) % screenshots.length); };
  const next = (e) => { e.preventDefault(); setIdx((i) => (i + 1) % screenshots.length); };
  return (
    <div className="carousel">
      <img
        src={`/${screenshots[idx]}`}
        alt={`${title} screenshot ${idx + 1}`}
        className="project-card__img"
        loading="lazy"
      />
      {screenshots.length > 1 && (
        <>
          <button className="carousel__btn carousel__btn--prev" onClick={prev} aria-label="Previous screenshot">&#8249;</button>
          <button className="carousel__btn carousel__btn--next" onClick={next} aria-label="Next screenshot">&#8250;</button>
          <div className="carousel__dots">
            {screenshots.map((_, i) => (
              <button
                key={i}
                className={`carousel__dot${i === idx ? ' carousel__dot--active' : ''}`}
                onClick={(e) => { e.preventDefault(); setIdx(i); }}
                aria-label={`Screenshot ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <article className="project-card">
      <ScreenshotCarousel title={project.title} screenshots={project.screenshots} />
      <div className="project-card__header">
        <h3 className="project-card__title">{project.title}</h3>
        <div className="project-card__tech">
          {(project.tech || []).map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>
      <p className="project-card__desc">{project.description}</p>
      <div className="project-card__links">
        {project.liveUrl && (
          <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--primary">
            Live Site ↗
          </a>
        )}
        {project.githubUrl && (
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--outline">
            GitHub ↗
          </a>
        )}
      </div>
    </article>
  );
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProjects(Array.isArray(data) ? data : (data.projects || []));
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <section id="projects" className="section">
      <div className="container">
        <h2 className="section__title">Featured Projects</h2>
        <p className="section__sub">Production-deployed applications built end-to-end.</p>

        {status === 'loading' && <p className="status-msg">Loading projects…</p>}
        {status === 'error' && (
          <p className="status-msg status-msg--error">
            Could not reach the API. Ensure the backend is running.
          </p>
        )}
        {status === 'ok' && (
          <div className="projects-grid">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Tech Stack
// ─────────────────────────────────────────────────────────────
const TECH = [
  'React', 'Node.js', 'Express', 'PostgreSQL', 'Docker',
  'AWS', 'Pulumi', 'GitHub Actions', 'TypeScript', 'Stripe',
];

function TechStack() {
  return (
    <section className="section section--dark">
      <div className="container">
        <h2 className="section__title">Tech Stack</h2>
        <div className="tech-grid">
          {TECH.map((t) => (
            <span key={t} className="tech-pill">{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// About
// ─────────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" className="section">
      <div className="container about-grid">
        <div className="about__photo">
          <img src="/assets/headshot-2026.png?v=20260503" alt="Demond Balentine Sr." className="about__headshot" />
        </div>
        <div className="about__text">
          <h2 className="section__title">About Me</h2>
          <p>
            I'm <strong>Demond Balentine Sr.</strong>, a full-stack developer and cloud architect
            focused on building production-grade SaaS products. I specialize in AWS cloud
            deployments, containerized microservices, CI/CD pipelines, and scalable API design.
          </p>
          <p>
            This site is deployed on <strong>AWS S3 + CloudFront</strong> (frontend) and
            <strong> AWS Elastic Beanstalk + EC2</strong> (backend), with
            <strong> RDS PostgreSQL</strong> for data persistence — all provisioned via
            <strong> Pulumi IaC</strong> and automated with <strong>GitHub Actions</strong>.
          </p>
          <a
            href="/assets/resume.pdf"
            download
            className="btn btn--primary"
          >
            Download Resume
          </a>
        </div>
        <div className="about__stats">
          {[
            ['3+', 'Years Building'],
            ['5+', 'Projects Shipped'],
            ['AWS', 'Cloud Certified'],
          ].map(([num, label]) => (
            <div key={label} className="stat-card">
              <span className="stat-card__num">{num}</span>
              <span className="stat-card__label">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────
const SERVICES = [
  {
    title: 'Full-Stack Development',
    desc: 'React frontends + Node.js/Express APIs — end-to-end feature delivery.',
  },
  {
    title: 'Cloud Architecture',
    desc: 'AWS deployments with VPC, EC2, RDS, S3, CloudFront, and CloudWatch.',
  },
  {
    title: 'DevOps & CI/CD',
    desc: 'GitHub Actions pipelines, Docker containerization, and IaC with Pulumi.',
  },
  {
    title: 'SaaS Products',
    desc: 'Multi-tenant platforms with Stripe billing, auth, and analytics.',
  },
];

function Services() {
  return (
    <section id="services" className="section section--dark">
      <div className="container">
        <h2 className="section__title">Services</h2>
        <div className="services-grid">
          {SERVICES.map((s) => (
            <div key={s.title} className="service-card">
              <h3 className="service-card__title">{s.title}</h3>
              <p className="service-card__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Marketing Videos — HeyGen AI
// ─────────────────────────────────────────────────────────────
function VideoSection() {
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [form, setForm] = useState({ avatarId: '', voiceId: '', script: '', title: '' });
  const [videoId, setVideoId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | loading-meta | ready | generating | polling | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = React.useRef(null);

  // Lazy-load avatars + voices only when section scrolls into view
  React.useEffect(() => {
    let loaded = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded) {
          loaded = true;
          loadMeta();
        }
      },
      { threshold: 0.1 }
    );
    const el = document.getElementById('videos');
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, []);

  // Clean up the polling interval on unmount
  React.useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function loadMeta() {
    setPhase('loading-meta');
    try {
      const [avRes, voRes] = await Promise.all([
        fetch(`${API_BASE}/api/heygen/avatars`),
        fetch(`${API_BASE}/api/heygen/voices`),
      ]);
      const avData = await avRes.json();
      const voData = await voRes.json();
      const avList = avData?.data?.avatars || [];
      const voList = voData?.data?.voices || [];
      setAvatars(avList);
      setVoices(voList);
      setForm((f) => ({
        ...f,
        avatarId: avList[0]?.avatar_id || '',
        voiceId:  voList[0]?.voice_id  || '',
      }));
      setPhase('ready');
    } catch {
      setPhase('error');
      setErrorMsg('Could not load HeyGen avatars/voices. Check your API key.');
    }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setPhase('generating');
    setVideoUrl(null);
    setVideoId(null);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/heygen/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarId: form.avatarId,
          voiceId:  form.voiceId,
          script:   form.script,
          title:    form.title || 'Marketing Video',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const vid = data?.data?.video_id || data?.video_id;
      if (!vid) throw new Error('No video_id returned');
      setVideoId(vid);
      setPhase('polling');
      startPolling(vid);
    } catch (err) {
      setPhase('error');
      setErrorMsg(err.message);
    }
  }

  function startPolling(vid) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/heygen/video-status/${vid}`);
        const data = await res.json();
        const status = data?.data?.status;
        if (status === 'completed') {
          clearInterval(pollRef.current);
          setVideoUrl(data?.data?.video_url);
          setPhase('done');
        } else if (status === 'failed') {
          clearInterval(pollRef.current);
          setPhase('error');
          setErrorMsg('Video generation failed on HeyGen side.');
        }
        // still 'processing' — keep polling
      } catch {
        clearInterval(pollRef.current);
        setPhase('error');
        setErrorMsg('Lost connection while polling for video status.');
      }
    }, 8000); // poll every 8 seconds
  }

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <section id="videos" className="section section--dark">
      <div className="container">
        <h2 className="section__title">AI Marketing Videos</h2>
        <p className="section__sub">
          Generate a professional AI avatar video — powered by HeyGen.
        </p>

        {phase === 'loading-meta' && (
          <p className="status-msg">Loading avatars &amp; voices…</p>
        )}

        {phase === 'error' && (
          <p className="status-msg status-msg--error">{errorMsg}</p>
        )}

        {(phase === 'ready' || phase === 'generating' || phase === 'polling' || phase === 'done') && (
          <div className="video-layout">
            <form className="video-form" onSubmit={handleGenerate}>
              <label className="video-label">
                Avatar
                <select
                  className="form-input"
                  name="avatarId"
                  value={form.avatarId}
                  onChange={onChange}
                  required
                >
                  {avatars.map((a) => (
                    <option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name}</option>
                  ))}
                </select>
              </label>

              <label className="video-label">
                Voice
                <select
                  className="form-input"
                  name="voiceId"
                  value={form.voiceId}
                  onChange={onChange}
                  required
                >
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>{v.name} ({v.language})</option>
                  ))}
                </select>
              </label>

              <label className="video-label">
                Video Title <span className="video-label__opt">(optional)</span>
                <input
                  className="form-input"
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  placeholder="e.g. Balentine Tech Intro"
                  maxLength={80}
                />
              </label>

              <label className="video-label">
                Script <span className="video-label__opt">(max 1500 chars)</span>
                <textarea
                  className="form-input form-textarea"
                  name="script"
                  value={form.script}
                  onChange={onChange}
                  rows={5}
                  maxLength={1500}
                  placeholder="Hi, I'm Demond Balentine — a full-stack developer and cloud architect…"
                  required
                />
                <span className="video-charcount">{form.script.length} / 1500</span>
              </label>

              <button
                className="btn btn--primary btn--full"
                type="submit"
                disabled={phase === 'generating' || phase === 'polling'}
              >
                {phase === 'generating' ? 'Submitting…' : phase === 'polling' ? 'Generating video…' : 'Generate Video'}
              </button>
            </form>

            <div className="video-preview">
              {phase === 'polling' && (
                <div className="video-spinner">
                  <div className="spinner" />
                  <p>HeyGen is rendering your video — this usually takes 1–3 minutes.</p>
                </div>
              )}
              {phase === 'done' && videoUrl && (
                <div className="video-result">
                  <video
                    src={videoUrl}
                    controls
                    className="video-player"
                    poster=""
                  />
                  <a
                    href={videoUrl}
                    download
                    className="btn btn--outline btn--full"
                    style={{ marginTop: '0.75rem' }}
                  >
                    Download Video
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Pricing / Subscriptions
// ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$97',
    period: '/mo',
    features: [
      'Landing page or portfolio build',
      'Monthly maintenance & updates',
      'Email support',
      'Basic cloud hosting setup',
    ],
    cta: 'Get Started',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$297',
    period: '/mo',
    features: [
      'Full-stack SaaS development',
      'CI/CD pipeline & Docker setup',
      'AWS cloud architecture',
      'Priority Slack support',
      'Monthly strategy call',
    ],
    cta: 'Go Pro',
    highlight: true,
  },
];

function PricingCard({ plan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={`pricing-card${plan.highlight ? ' pricing-card--featured' : ''}`}>
      {plan.highlight && <span className="pricing-card__badge">Most Popular</span>}
      <h3 className="pricing-card__name">{plan.name}</h3>
      <div className="pricing-card__price">
        <span className="pricing-card__amount">{plan.price}</span>
        <span className="pricing-card__period">{plan.period}</span>
      </div>
      <ul className="pricing-card__features">
        {plan.features.map((f) => (
          <li key={f} className="pricing-card__feature">✓ {f}</li>
        ))}
      </ul>
      <button
        className={`btn btn--full${plan.highlight ? ' btn--primary' : ' btn--outline'}`}
        onClick={handleSubscribe}
        disabled={loading}
      >
        {loading ? 'Redirecting…' : plan.cta}
      </button>
      {error && <p className="form-feedback form-feedback--error">{error}</p>}
    </div>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="section section--dark">
      <div className="container">
        <h2 className="section__title">Subscription Plans</h2>
        <p className="section__sub">
          Ongoing development and cloud support — billed monthly, cancel any time.
        </p>
        <div className="pricing-grid">
          {PLANS.map((p) => (
            <PricingCard key={p.id} plan={p} />
          ))}
        </div>
        <p className="pricing-note">
          Need something custom?{' '}
          <a href="#contact" className="pricing-note__link">Let's talk →</a>
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Contact Form
// ─────────────────────────────────────────────────────────────
function Contact() {
  const [form, setForm] = useState({ name: '', email: '', project: '', message: '' });
  const [status, setStatus] = useState(null); // null | 'sending' | 'ok' | 'error'

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }
      setStatus('ok');
      setForm({ name: '', email: '', project: '', message: '' });
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="section">
      <div className="container contact-container">
        <h2 className="section__title">Get In Touch</h2>
        <p className="section__sub">
          Have a project in mind? Let's build something together.
        </p>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <input
              className="form-input"
              type="text"
              name="name"
              placeholder="Your Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <input
            className="form-input"
            type="text"
            name="project"
            placeholder="Project Type (e.g. SaaS Platform, API, Cloud Migration)"
            value={form.project}
            onChange={handleChange}
            required
          />
          <textarea
            className="form-input form-textarea"
            name="message"
            placeholder="Tell me about your project…"
            rows={5}
            value={form.message}
            onChange={handleChange}
            required
          />
          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Send Message'}
          </button>

          {status === 'ok' && (
            <p className="form-feedback form-feedback--ok">
              ✓ Message sent! I'll be in touch within 24–48 hours.
            </p>
          )}
          {status === 'error' && (
            <p className="form-feedback form-feedback--error">
              ✗ Could not send message. Please try again or email directly.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="footer">
      <p className="footer__copy">
        © {new Date().getFullYear()} Balentine Tech Solutions — Demond Balentine Sr.
      </p>
      <div className="footer__links">
        <a href="https://github.com/Debalent" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a href="https://linkedin.com/in/demond-balentine" target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Projects />
        <TechStack />
        <About />
        <Services />
        <VideoSection />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
