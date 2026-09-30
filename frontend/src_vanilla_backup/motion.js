/**
 * motion.js — GSAP-powered UI motion system
 * Patterns extracted from bang-motion skill (github.com/bangtutorial/bang-motion)
 * Uses GSAP 3.12 for spring physics, staggered entrances, and cinematic transitions.
 */

// ─── GSAP is loaded via CDN script tag before this module ───────────────────
const gsap = window.gsap;
if (!gsap) {
  console.warn('[motion] GSAP not loaded — motion enhancements disabled.');
}

// ─── Easing presets (from bang-motion techniques.md §4 patterns) ────────────
const EASE = {
  OUT_SPRING: 'elastic.out(0.7, 0.5)',  // spring pop
  OUT_EXPO:   'expo.out',               // fast snap
  OUT_CIRC:   'circ.out',              // smooth decelerate
  IN_EXPO:    'expo.in',               // fast entry
  SOFT:       'power2.out',            // gentle
};

// ─── 1. Auth Overlay — Cinematic exit when logging in ────────────────────────
export function animateAuthExit(overlayEl, onComplete) {
  if (!gsap || !overlayEl) { onComplete?.(); return; }
  gsap.to(overlayEl, {
    opacity: 0,
    scale: 1.04,
    filter: 'blur(8px)',
    duration: 0.55,
    ease: EASE.IN_EXPO,
    onComplete,
  });
}

// ─── 2. Dashboard Panel — Staggered fade-up entrance ─────────────────────────
export function animatePanelEntrance(containerSelector) {
  if (!gsap) return;
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const items = container.querySelectorAll(
    '.nav-item, .stat-card, .result-card, .results-card, .analysis-card, ' +
    '.layer-card, .chart-container, .chatgpt-card, .table-container, .admin-card'
  );
  if (!items.length) return;

  gsap.fromTo(items,
    { opacity: 0, y: 18, scale: 0.97 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      stagger: 0.06,
      ease: EASE.OUT_CIRC,
      clearProps: 'transform,opacity',
    }
  );
}

// ─── 3. Modal — Spring open / smooth close ───────────────────────────────────
export function animateModalOpen(modalEl) {
  if (!gsap || !modalEl) return;
  const inner = modalEl.querySelector(
    '.account-settings-modal, .admin-modal-content, .admin-add-modal-content'
  );
  gsap.set(modalEl, { display: 'flex' });
  gsap.fromTo(modalEl,
    { opacity: 0 },
    { opacity: 1, duration: 0.25, ease: EASE.SOFT }
  );
  if (inner) {
    gsap.fromTo(inner,
      { opacity: 0, y: 28, scale: 0.93 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: EASE.OUT_SPRING }
    );
  }
}

export function animateModalClose(modalEl, onComplete) {
  if (!gsap || !modalEl) {
    if (modalEl) modalEl.style.display = 'none';
    onComplete?.();
    return;
  }
  const inner = modalEl.querySelector(
    '.account-settings-modal, .admin-modal-content, .admin-add-modal-content'
  );
  const tl = gsap.timeline({ onComplete: () => {
    modalEl.style.display = 'none';
    onComplete?.();
  }});
  if (inner) {
    tl.to(inner, { opacity: 0, y: 16, scale: 0.95, duration: 0.2, ease: EASE.IN_EXPO }, 0);
  }
  tl.to(modalEl, { opacity: 0, duration: 0.22, ease: EASE.SOFT }, 0);
}

// ─── 4. Card 3D tilt on hover ─────────────────────────────────────────────────
const TILT_MAX = 5; // degrees

function applyTilt(el) {
  if (!gsap) return;
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) / (r.width / 2);
    const dy = (e.clientY - cy) / (r.height / 2);
    gsap.to(el, {
      rotateY: dx * TILT_MAX,
      rotateX: -dy * TILT_MAX,
      scale: 1.015,
      duration: 0.4,
      ease: EASE.SOFT,
      transformPerspective: 900,
    });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, {
      rotateY: 0, rotateX: 0, scale: 1,
      duration: 0.55,
      ease: EASE.OUT_SPRING,
      clearProps: 'rotateX,rotateY,scale',
    });
  });
}

export function enableCardTilt(containerSelector) {
  if (!gsap) return;
  const cards = document.querySelectorAll(
    `${containerSelector} .result-card, ${containerSelector} .results-card, ` +
    `${containerSelector} .layer-card`
  );
  cards.forEach(applyTilt);
}

// ─── 5. Nav item hover slide ───────────────────────────────────────────────────
export function enableNavHoverGlow(navSelector) {
  if (!gsap) return;
  const items = document.querySelectorAll(`${navSelector} .nav-item`);
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      gsap.to(item, { x: 3, duration: 0.3, ease: EASE.OUT_EXPO });
    });
    item.addEventListener('mouseleave', () => {
      gsap.to(item, { x: 0, duration: 0.4, ease: EASE.OUT_SPRING });
    });
  });
}

// ─── 6. Toast — spring slide-up from bottom ───────────────────────────────────
export function animateToastIn(toastEl) {
  if (!gsap || !toastEl) return;
  gsap.fromTo(toastEl,
    { opacity: 0, y: 24, scale: 0.92 },
    { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: EASE.OUT_SPRING }
  );
}

export function animateToastOut(toastEl) {
  if (!gsap || !toastEl) return;
  gsap.to(toastEl, {
    opacity: 0, y: 12, scale: 0.92,
    duration: 0.25, ease: EASE.IN_EXPO,
    onComplete: () => { toastEl.style.display = 'none'; }
  });
}

// ─── 7. View switch fade ───────────────────────────────────────────────────────
export function animateViewSwitch(newPanelEl) {
  if (!gsap || !newPanelEl) return;
  gsap.fromTo(newPanelEl,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.35, ease: EASE.OUT_CIRC }
  );
}

// ─── 8. Analyse button breathing pulse while loading ──────────────────────────
let _analyseLoop = null;

export function startAnalysePulse(btnEl) {
  if (!gsap || !btnEl) return;
  stopAnalysePulse(btnEl);
  _analyseLoop = gsap.to(btnEl, {
    scale: 0.97, opacity: 0.8,
    duration: 0.55, yoyo: true, repeat: -1, ease: EASE.SOFT,
  });
}

export function stopAnalysePulse(btnEl) {
  if (_analyseLoop) { _analyseLoop.kill(); _analyseLoop = null; }
  if (gsap && btnEl) gsap.to(btnEl, { scale: 1, opacity: 1, duration: 0.3, ease: EASE.OUT_SPRING });
}

// ─── 9. Initialise all passive enhancements ───────────────────────────────────
export function initMotion() {
  if (!gsap) return;
  gsap.config({ force3D: true });
  requestAnimationFrame(() => {
    animatePanelEntrance('#app');
    enableNavHoverGlow('.sidebar');
    enableCardTilt('#app');
  });
}
