/**
 * motion.js - GSAP-powered motion system for React components
 * Inspired by bang-motion skill
 */

const getGsap = () => (typeof window !== 'undefined' ? window.gsap : null);

export const EASE = {
  OUT_SPRING: 'elastic.out(0.7, 0.5)',
  OUT_EXPO: 'expo.out',
  OUT_CIRC: 'circ.out',
  IN_EXPO: 'expo.in',
  SOFT: 'power2.out',
};

export function animatePanelEntrance(containerEl) {
  const gsap = getGsap();
  if (!gsap || !containerEl) return;

  const items = containerEl.querySelectorAll('.glass-card, .view-panel > *');
  if (!items.length) return;

  gsap.fromTo(items,
    { opacity: 0, y: 16, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.45,
      stagger: 0.05,
      ease: EASE.OUT_CIRC,
      clearProps: 'transform,opacity'
    }
  );
}

export function startButtonPulse(btnEl) {
  const gsap = getGsap();
  if (!gsap || !btnEl) return null;

  return gsap.to(btnEl, {
    scale: 0.97,
    opacity: 0.82,
    duration: 0.55,
    yoyo: true,
    repeat: -1,
    ease: EASE.SOFT,
  });
}

export function stopButtonPulse(btnEl, tween) {
  const gsap = getGsap();
  if (tween) {
    tween.kill();
  }
  if (gsap && btnEl) {
    gsap.to(btnEl, { scale: 1, opacity: 1, duration: 0.25, ease: EASE.OUT_SPRING });
  }
}
