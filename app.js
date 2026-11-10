// Clínica Micheli Rodrigues — prévia conceitual (Bruno Luque). Ideia central: "Dê um passo atrás."
// O conteúdo funciona sem este arquivo: estados escondidos só existem depois de `motion-ready`.
//
// Motion em 3 camadas
//  ASSINATURA  hero (recorte próximo que se abre) e a cena presa "O passo atrás": o quadro do retrato recua
//              em 4 etapas (detalhe, rosto, pessoa, espaço), com mola interrompível.        [image-zoom--editorial, path--sereno]
//  NARRATIVA   molduras concêntricas que se afastam com a rolagem (uma parte, o conjunto) e a linha
//              que liga as etapas da avaliação.                                              [path--sereno, image-zoom--sereno]
//  INTERFACE   botão cuja borda recua 4px, chips de dúvida, títulos em máscara de linhas.      [magnetic--preciso, line-mask--editorial]

const root = document.documentElement;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
const wideMQ = matchMedia('(min-width: 900px)');
const reduce = reduceMQ.matches;
if (reduce) root.classList.add('reduce');

// ---- tokens de motion (espelham o CSS) ----
const EASE_OUT = [0.23, 1, 0.32, 1];
const EASE_IN_OUT = [0.77, 0, 0.175, 1];
const DUR = { press: 0.13, ctl: 0.2, panel: 0.32 };
const SPRING = { stiffness: 150, damping: 21 };   // mola da cena (leve overshoot interno, travado nos limites)
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const WA = 'https://wa.me/5548998588382';

const M = window.Motion || null;
if (!M) console.warn('Motion indisponível; página segue estática.');
const animated = !!M && !reduce;
const prog = (p) => (typeof p === 'number' ? p : p?.y?.progress ?? 0);

/* ------------------------------------------------------------------ */
/* O quadro: pontos-chave do recuo (escala, foco vertical, margem)      */
/* 0 detalhe · 1 rosto · 2 pessoa · 3 espaço                            */
/* escala máxima respeita o tamanho nativo da foto (sem ampliar demais) */
/* ------------------------------------------------------------------ */
const KEYS = [
  { s: 2.7, fy: 0.335 },
  { s: 1.7, fy: 0.35 },
  { s: 1.0, fy: 0.48 },
  { s: 0.6, fy: 0.5 },
];
function keyAt(pos) {
  pos = clamp(pos, 0, 3);
  const i = Math.min(2, Math.floor(pos)), t = pos - i;
  const a = KEYS[i], b = KEYS[i + 1];
  return { s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)), fy: lerp(a.fy, b.fy, t) };
}
function paintShot(shot, pos, extra = {}) {
  const k = keyAt(pos);
  shot.style.setProperty('--s', (extra.s ?? k.s).toFixed(4));
  shot.style.setProperty('--fy', (extra.fy ?? k.fy).toFixed(4));
  shot.style.setProperty('--fx', '0.5');
  // margem do recorte: os cantos se afastam conforme o quadro se abre
  const co = lerp(12, -4, smooth(clamp(pos / 3)));
  shot.style.setProperty('--co', co.toFixed(1) + 'px');
  shot.classList.toggle('is-mat', (extra.s ?? k.s) < 0.99);
}

/* ------------------------------------------------------------------ */
/* Mola escalar (velocidade preservada, interrompível, pausa fora)      */
/* ------------------------------------------------------------------ */
function springScalar(apply, { stiffness = 150, damping = 21 } = {}, start = 0) {
  const s = { x: start, v: 0, t: start, raf: 0, last: 0 };
  const tick = (now) => {
    const dt = Math.min(0.032, (now - (s.last || now)) / 1000 || 0.016); s.last = now;
    s.v += (-stiffness * (s.x - s.t) - damping * s.v) * dt;
    s.x += s.v * dt;
    apply(s.x);
    if ((Math.abs(s.x - s.t) > 0.0008 || Math.abs(s.v) > 0.003) && !document.hidden) s.raf = requestAnimationFrame(tick);
    else { s.x = s.t; s.v = 0; apply(s.x); s.raf = 0; s.last = 0; }
  };
  return {
    to(v) { s.t = v; if (!s.raf) s.raf = requestAnimationFrame(tick); },
    jump(v) { s.t = s.x = v; s.v = 0; if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; s.last = 0; } apply(v); },
    get value() { return s.x; },
    stop() { if (s.raf) cancelAnimationFrame(s.raf); s.raf = 0; },
  };
}

/* ------------------------------------------------------------------ */
/* Topo, rolagem contínua (só roda do mouse) e âncoras                  */
/* ------------------------------------------------------------------ */
const top = $('[data-top]');
const onScrollTop = () => top.classList.toggle('is-solid', scrollY > 24);
addEventListener('scroll', onScrollTop, { passive: true }); onScrollTop();

let lenis = null;
function startLenis() {
  if (reduce || !window.Lenis || lenis || !fineMQ.matches) return;
  lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
  const raf = (t) => { if (!lenis) return; lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
if (window.Lenis) startLenis(); else addEventListener('load', startLenis, { once: true });
reduceMQ.addEventListener('change', () => { if (reduceMQ.matches && lenis) { lenis.destroy(); lenis = null; } });
const goTo = (y, instant) => {
  if (lenis) lenis.scrollTo(y, { duration: instant ? 0 : 1.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else scrollTo({ top: y, behavior: reduce || instant ? 'auto' : 'smooth' });
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id === '#inicio' ? document.body : $(id);
  if (!target) return;
  e.preventDefault();
  const y = id === '#inicio' ? 0 : target.getBoundingClientRect().top + scrollY - (id === '#passo' ? 0 : top.offsetHeight + 8);
  goTo(y);
  if (id !== '#inicio') { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
});

/* ------------------------------------------------------------------ */
/* Estado final por padrão (sem Motion, reduced-motion, celular)        */
/* ------------------------------------------------------------------ */
$$('[data-mini]').forEach((sh) => paintShot(sh, Number(sh.dataset.mini)));
const heroShot = $('[data-hero-shot]');
const stageShot = $('[data-stage-shot]');
if (stageShot) paintShot(stageShot, 0);

/* ------------------------------------------------------------------ */
/* Chips de dúvida (tablist com teclado; funciona sem Motion)           */
/* ------------------------------------------------------------------ */
const chipsBox = $('[data-chips]');
if (chipsBox) {
  const tabs = $$('.chip', chipsBox);
  const panels = tabs.map((t) => $('#' + t.getAttribute('aria-controls')));
  let cur = 0, anim = null;
  const select = (i, focus) => {
    if (i === cur && !focus) return;
    const prev = panels[cur];
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    if (anim) anim.stop();
    prev.hidden = true;
    panels[i].hidden = false;
    cur = i;
    if (animated) anim = M.animate(panels[i], { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: DUR.panel, ease: EASE_OUT });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  chipsBox.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); select((cur + k + tabs.length) % tabs.length, true); }
    else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
    else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
  });
}

/* ------------------------------------------------------------------ */
/* Contato: mensagem pré-preenchida, WhatsApp e copiar                  */
/* ------------------------------------------------------------------ */
const composer = $('[data-composer]');
if (composer) {
  const ta = $('textarea', composer), ok = $('[data-copy-ok]', composer);
  let t = 0;
  const say = (m) => { ok.textContent = m; clearTimeout(t); t = setTimeout(() => (ok.textContent = ''), 2600); };
  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = ta.value.trim();
    if (!v) { say('Escreva uma mensagem curta.'); ta.focus(); return; }
    window.open(`${WA}?text=${encodeURIComponent(v)}`, '_blank', 'noopener');
  });
  $('[data-copy]', composer).addEventListener('click', async () => {
    const v = ta.value.trim();
    if (!v) { say('Escreva uma mensagem curta.'); ta.focus(); return; }
    try { await navigator.clipboard.writeText(v); say('Mensagem copiada.'); }
    catch { ta.select(); try { document.execCommand('copy'); say('Mensagem copiada.'); } catch { say('Selecione e copie o texto.'); } }
  });
}

/* ------------------------------------------------------------------ */
/* CTA fixo no celular: aparece depois do hero, some no contato         */
/* ------------------------------------------------------------------ */
const sticky = $('[data-sticky]');
if (sticky) {
  let pastHero = false, inContact = false;
  const upd = () => sticky.classList.toggle('is-on', pastHero && !inContact);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; upd(); }, { threshold: 0.2 }).observe($('[data-hero]'));
  new IntersectionObserver(([e]) => { inContact = e.isIntersecting; upd(); }, { threshold: 0.15 }).observe($('[data-contato]'));
}

/* ------------------------------------------------------------------ */
/* Motion                                                              */
/* ------------------------------------------------------------------ */
if (M && reduce) root.classList.add('motion-ready');

if (animated) {
  const { animate, scroll, inView, stagger } = M;
  root.classList.add('motion-ready');

  /* ---- ASSINATURA 1 · HERO: título em máscara, o recorte se abre como uma lente ---- */
  animate('.hero__title .line > span', { transform: ['translateY(112%)', 'translateY(0%)'] }, { duration: 1, delay: stagger(0.09), ease: EASE_OUT });
  animate('.eyebrow--hero, .hero__lead, .hero__actions', { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0)'] }, { duration: 0.8, delay: stagger(0.1, { startDelay: 0.3 }), ease: EASE_OUT });
  animate('.hero__frame .shot', { clipPath: ['inset(34% 34% 34% 34%)', 'inset(0% 0% 0% 0%)'] }, { duration: 1.3, delay: 0.15, ease: EASE_IN_OUT });

  /* ---- NARRATIVA 1 · ao rolar, o hero já começa a recuar (a câmera se afasta do rosto) ---- */
  if (heroShot) {
    scroll((p) => { const t = smooth(clamp(prog(p) * 1.25)); paintShot(heroShot, 0, { s: lerp(2.4, 1.35, t), fy: lerp(0.335, 0.42, t) }); heroShot.style.setProperty('--co', lerp(12, 22, t).toFixed(1) + 'px'); }, { target: $('[data-hero]'), offset: ['start start', 'end start'] });
  }

  /* ---- NARRATIVA 2 · molduras concêntricas: o conjunto se afasta da parte ---- */
  const conc = $('[data-conc]');
  if (conc) {
    conc.style.setProperty('--gap', '0px');
    scroll((p) => conc.style.setProperty('--gap', (smooth(clamp(prog(p) * 1.15)) * 22).toFixed(2) + 'px'), { target: conc, offset: ['start 0.95', 'center 0.5'] });
  }

  /* ---- NARRATIVA 3 · a linha que liga as etapas da avaliação ---- */
  const avl = $('[data-avl-list]');
  if (avl) {
    avl.style.setProperty('--p', '0');
    scroll((p) => avl.style.setProperty('--p', clamp(prog(p) * 1.05).toFixed(3)), { target: avl, offset: ['start 0.8', 'end 0.65'] });
  }

  /* ---- INTERFACE · títulos em máscara de linhas ---- */
  $$('[data-mask], .contato h2').forEach((h) => {
    const spans = $$('.line > span', h);
    inView(h, () => { animate(spans, { transform: ['translateY(112%)', 'translateY(0%)'] }, { duration: 0.95, delay: stagger(0.09), ease: EASE_OUT }); }, { amount: 0.4 });
  });

  /* ---- Celular/sem cena presa: cada quadro se abre ao entrar ---- */
  const minis = $$('[data-mini]');
  const miniCancels = [];
  const miniOn = () => {
    if (miniCancels.length) return;
    minis.forEach((sh) => {
      const k = Number(sh.dataset.mini);
      const from = Math.max(0, k - 1), to = k;
      paintShot(sh, from);
      miniCancels.push(scroll((p) => { const t = smooth(clamp(prog(p) / 0.8)); paintShot(sh, lerp(from, to, t)); }, { target: sh, offset: ['start 0.95', 'start 0.35'] }));
    });
  };
  const miniOff = () => { miniCancels.splice(0).forEach((c) => c()); minis.forEach((sh) => paintShot(sh, Number(sh.dataset.mini))); };

  /* ---- ASSINATURA 2 · O PASSO ATRÁS (cena presa, desktop) ---- */
  const scene = $('[data-scene]');
  const steps = $$('[data-step]');
  const fill = $('[data-rule-fill]');
  const roll = $('[data-roll]');
  let cancelScene = null, active = 0, lastSet = -1, target = 0;
  const rollH = () => (roll.firstElementChild ? roll.firstElementChild.offsetHeight : 0);

  const setActive = (i) => {
    if (i === active) return;
    steps[active].classList.remove('is-active'); $('.step__btn', steps[active]).removeAttribute('aria-current');
    active = i;
    steps[i].classList.add('is-active'); $('.step__btn', steps[i]).setAttribute('aria-current', 'step');
  };
  const render = (pos) => {
    pos = clamp(pos, 0, 3);
    if (Math.abs(pos - lastSet) < 0.0006) return;
    lastSet = pos;
    paintShot(stageShot, pos);
    fill.style.transform = `scaleY(${(pos / 3).toFixed(4)})`;
    roll.style.transform = `translateY(${(-pos * rollH()).toFixed(1)}px)`;
    setActive(Math.round(pos));
  };
  const spring = springScalar(render, SPRING, 0);
  // a rolagem define o destino; a mola leva o quadro até lá (interrompível a qualquer momento)
  const targetFrom = (p) => {
    const s = clamp(p) * 4, i = Math.min(3, Math.floor(s)), l = s - i;
    return i < 3 ? i + smooth(clamp((l - 0.55) / 0.45)) : 3;
  };
  const pinOn = () => {
    if (cancelScene) return;
    miniOff();
    root.classList.add('pinned');
    lastSet = -1;
    cancelScene = scroll((p) => { target = targetFrom(prog(p)); spring.to(target); }, { target: scene, offset: ['start start', 'end end'] });
    spring.jump(0); lastSet = -1; render(0);
  };
  const pinOff = () => {
    if (cancelScene) { cancelScene(); cancelScene = null; spring.stop(); root.classList.remove('pinned'); }
    steps.forEach((s, k) => { s.classList.toggle('is-active', k === 0); });
    active = 0;
    miniOn();
  };
  const applyMode = () => { (wideMQ.matches && innerHeight >= 600 ? pinOn : pinOff)(); };
  wideMQ.addEventListener('change', applyMode);
  addEventListener('resize', applyMode);
  applyMode();

  // índice e setas: cada etapa leva ao seu detente (a mola cuida da transição)
  const goStep = (i) => {
    if (!cancelScene) return;
    const p = i < 3 ? (i + 0.2) / 4 : 0.9;
    goTo(scene.getBoundingClientRect().top + scrollY + p * (scene.offsetHeight - innerHeight));
  };
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => goStep(Number(b.dataset.goto))));
  $('[data-steps]').addEventListener('keydown', (e) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!d || !cancelScene) return;
    e.preventDefault();
    const i = clamp(active + d, 0, 3);
    $$('[data-goto]')[i].focus({ preventScroll: true });
    goStep(i);
  });
}
