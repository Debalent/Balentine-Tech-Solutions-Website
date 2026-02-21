/* ============================================
   NAVIGATION & SCROLL EFFECTS
   ============================================ */

// Navigation elements
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link');

// Mobile nav toggle
navToggle?.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle?.classList.remove('active');
        navMenu?.classList.remove('active');
    });
});

// Scroll effect for nav background
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add scrolled class for background effect
    if (currentScroll > 50) {
        nav?.classList.add('scrolled');
    } else {
        nav?.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// Active nav link on scroll
const sections = document.querySelectorAll('section[id]');

function updateActiveLink() {
    const scrollPosition = window.pageYOffset + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', updateActiveLink);
updateActiveLink();

/* ============================================
   DARK MODE TOGGLE
   ============================================ */

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Check for saved theme preference or default to 'dark'
const currentTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', currentTheme);

themeToggle?.addEventListener('click', () => {
    const theme = html.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

/* ============================================
   SMOOTH SCROLLING
   ============================================ */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));

        if (target) {
            const navHeight = nav?.offsetHeight || 80;
            const targetPosition = target.offsetTop - navHeight - 20;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

/* ============================================
   INTERSECTION OBSERVER FOR ANIMATIONS
   ============================================ */

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe elements
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
document.querySelectorAll('.project-card').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});
document.querySelectorAll('.service-card').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});
document.querySelectorAll('.blog-card').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});
document.querySelectorAll('.tech-item').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
});

/* ============================================
   CONTACT FORM HANDLING
   ============================================ */

const contactForm = document.getElementById('contactForm');

contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);

    // Get the submit button
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="animation: spin 1s linear infinite;">
            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3"/>
            <path d="M10 3 A 7 7 0 0 1 17 10" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
        Sending...
    `;

    // Simulate form submission (replace with actual backend endpoint)
    try {
        // In a real application, you would send this to your backend:
        // await fetch('/api/contact', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data)
        // });

        console.log('Form submitted:', data);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Show success message
        submitButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Message Sent!
        `;
        submitButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';

        // Reset form
        contactForm.reset();

        // Reset button after delay
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            submitButton.style.background = '';
        }, 3000);

    } catch (error) {
        console.error('Form submission error:', error);

        // Show error message
        submitButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 6v4M10 14h.01M18.333 10a8.333 8.333 0 11-16.666 0 8.333 8.333 0 0116.666 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Error - Try Again
        `;
        submitButton.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';

        // Reset button after delay
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            submitButton.style.background = '';
        }, 3000);
    }
});

/* ============================================
   PARALLAX EFFECTS
   ============================================ */

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;

    // Parallax for hero background
    const heroBackground = document.querySelector('.hero-background');
    if (heroBackground) {
        heroBackground.style.transform = `translateY(${scrolled * 0.5}px)`;
    }

    // Parallax for gradient mesh
    const gradientMesh = document.querySelector('.gradient-mesh');
    if (gradientMesh) {
        gradientMesh.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
});

/* ============================================
   PROJECT CARD HOVER EFFECTS
   ============================================ */

const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = '';
    });
});

/* ============================================
   TECH STACK ITEM ANIMATIONS
   ============================================ */

const techItems = document.querySelectorAll('.tech-item');

techItems.forEach((item, index) => {
    // Stagger animation delay
    item.style.animationDelay = `${index * 0.05}s`;

    // Add hover sound effect (optional)
    item.addEventListener('mouseenter', () => {
        // You could add a subtle sound effect here if desired
    });
});

/* ============================================
   SCROLL TO TOP BUTTON (Optional)
   ============================================ */

// Create scroll to top button
const scrollTopButton = document.createElement('button');
scrollTopButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
`;
scrollTopButton.className = 'scroll-to-top';
scrollTopButton.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s;
    z-index: 999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
`;

document.body.appendChild(scrollTopButton);

// Show/hide scroll to top button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 500) {
        scrollTopButton.style.opacity = '1';
        scrollTopButton.style.visibility = 'visible';
    } else {
        scrollTopButton.style.opacity = '0';
        scrollTopButton.style.visibility = 'hidden';
    }
});

// Scroll to top on click
scrollTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Hover effect for scroll to top button
scrollTopButton.addEventListener('mouseenter', () => {
    scrollTopButton.style.transform = 'translateY(-4px) scale(1.05)';
    scrollTopButton.style.boxShadow = '0 10px 20px rgba(99, 102, 241, 0.3)';
});

scrollTopButton.addEventListener('mouseleave', () => {
    scrollTopButton.style.transform = '';
    scrollTopButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
});

/* ============================================
   PERFORMANCE OPTIMIZATIONS
   ============================================ */

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/* ============================================
   INITIALIZATION
   ============================================ */

// Initialize all animations and effects when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('ðŸš€ Balentine Tech Solutions - Website Initialized');

    // Add initial fade-in class to elements
    document.querySelectorAll('.hero-content').forEach(el => {
        el.classList.add('visible');
    });

    // Preload critical images
    const criticalImages = ['logo.jpg', 'profile-photo.jpg'];
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
});

// Add CSS for spin animation used in form submission
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
