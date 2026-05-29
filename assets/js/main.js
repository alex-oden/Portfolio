/* ============================================================
   ALODEN — SHARED SCRIPTS
   Used across all pages. Handles:
   - Navbar scroll effect
   - Hamburger / mobile fullscreen menu
   - Fade-up scroll animations
   Load with: <script src="assets/js/main.js" defer></script>
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 1. NAVBAR SCROLL EFFECT ---------- */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 2. HAMBURGER / MOBILE MENU ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    const setMenu = (open) => {
      hamburger.classList.toggle('open', open);
      mobileMenu.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    hamburger.addEventListener('click', () => {
      setMenu(!hamburger.classList.contains('open'));
    });

    // Close when any link inside the menu is tapped
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => setMenu(false));
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) setMenu(false);
    });
  }

  /* ---------- 3. FADE-UP SCROLL ANIMATIONS ---------- */
  const faders = document.querySelectorAll('.fu');
  if (faders.length) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('vis');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    faders.forEach((el) => obs.observe(el));

    // Reveal above-the-fold elements immediately (hero / header / breadcrumb)
    setTimeout(() => {
      document
        .querySelectorAll('#hero .fu, .page-hero .fu, .case-hero .fu, .post-header .fu, .resume-hero .fu, .breadcrumb.fu, .post-cover.fu')
        .forEach((el) => el.classList.add('vis'));
    }, 80);
  }

  /* ---------- 4. READING PROGRESS BAR (blog-single only) ---------- */
  const progressFill = document.getElementById('progressFill');
  const article = document.querySelector('.article');
  if (progressFill && article) {
    window.addEventListener('scroll', () => {
      const top = article.offsetTop;
      const height = article.offsetHeight;
      const winH = window.innerHeight;
      const scrolled = Math.min(Math.max((window.scrollY + winH - top) / height, 0), 1);
      progressFill.style.width = scrolled * 100 + '%';
    }, { passive: true });
  }

  /* ---------- 5. FILTER / CATEGORY BUTTONS (work + blog) ---------- */
  document.querySelectorAll('.filters, .cats').forEach((group) => {
    const buttons = group.querySelectorAll('.filter, .cat');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

})();
