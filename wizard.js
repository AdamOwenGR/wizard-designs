/* Green Retreats – single-page wizard prototype
   State: range -> model -> size. Changing an upper level clears everything below it. */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const fmt = n => '£' + Math.round(n).toLocaleString('en-GB');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { range: null, model: null, size: null };
  const rendered = { range: undefined, model: undefined };

  const el = {
    secRange: $('#sec-range'), secModel: $('#sec-model'), secSize: $('#sec-size'),
    rangeCards: $('#range-cards'), modelCards: $('#model-cards'), modelSub: $('#model-sub'),
    sizeScroll: $('#size-scroll'),
    hero: $('#hero'), lines: $('#lines'),
    total: $('#total'), totalFrom: $('#total-from'), totalLabel: $('#total-label'), totalNote: $('#total-note'),
    sum: $('#sum'), configure: $('#configure'), footNote: $('#foot-note'),
    reset: $('#reset'), toast: $('#toast')
  };

  const rangeByKey = k => RANGES.find(r => r.key === k);
  const modelById = id => Object.values(MODELS).flat().find(m => m.id === id);

  /* ---------- View transition wrapper ---------- */
  let vtRunning = null;
  function transition(update) {
    if (!document.startViewTransition || reduceMotion) { update(); return; }
    if (vtRunning) vtRunning.skipTransition();
    vtRunning = document.startViewTransition(update);
    vtRunning.finished.finally(() => { vtRunning = null; });
  }

  /* Per-card stagger for entering cards (pseudo-elements can't read per-element vars) */
  (function buildStaggerStyles() {
    const rules = [];
    const add = (names, i) => names.forEach(n =>
      rules.push(`::view-transition-new(${n}):only-child{animation-delay:${120 + i * 45}ms!important}`));
    Object.values(MODELS).forEach(list => list.forEach((m, i) => add([`m-${m.id}`, `mi-${m.id}`, `mt-${m.id}`], i)));
    const s = document.createElement('style');
    s.textContent = rules.join('\n');
    document.head.appendChild(s);
  })();

  /* ---------- Cards ---------- */
  function cardHTML(prefix, id, i, img, title, more) {
    return `<button type="button" class="card" data-id="${id}" style="--i:${i};view-transition-name:${prefix}-${id}" aria-pressed="false">
      <span class="card-img" style="view-transition-name:${prefix}i-${id}"><img src="${IMG_BASE}${img}" alt="" width="133" height="100"></span>
      <span class="card-title" style="view-transition-name:${prefix}t-${id}">${title}</span>
      <span class="card-more">${more}</span>
    </button>`;
  }

  function renderRangeCards() {
    el.rangeCards.innerHTML = RANGES.map((r, i) => cardHTML('r', r.key, i, r.img, r.name,
      `<span class="card-blurb">${r.blurb}</span>
       <span class="card-from">From ${fmt(r.from)}</span>
       <span class="card-btn">Select</span>`)).join('');
    el.rangeCards.classList.add('intro');
    setTimeout(() => el.rangeCards.classList.remove('intro'), 1200);
  }

  function renderModelCards() {
    const list = MODELS[state.range] || [];
    el.modelCards.innerHTML = list.map((m, i) => cardHTML('m', m.id, i, m.img, m.name,
      `<span class="card-tag tag-${state.range}">${rangeByKey(state.range).name}</span>
       <span class="card-blurb">${m.blurb}</span>
       <span class="card-from">From ${fmt(m.from)}</span>
       <span class="card-btn">Select</span>`)).join('');
    const r = rangeByKey(state.range);
    el.modelSub.textContent = `${list.length} ${list.length === 1 ? 'model' : 'models'} in the ${r.name}. Pick one to see its sizes and prices.`;
  }

  function markSelected(container, id) {
    container.querySelectorAll('.card').forEach(c => {
      const on = c.dataset.id === id;
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', on);
    });
  }

  /* ---------- Size table ---------- */
  function renderSizes() {
    const m = modelById(state.model);
    const g = GRIDS[m.grid];
    const head = `<tr><th scope="col" class="corner">Depth ↓ &nbsp;Width →</th>${
      g.wl.map((w, c) => `<th scope="col" data-c="${c}">${w}m</th>`).join('')}</tr>`;
    const body = g.rows.map(([dl, dmm, prices], r) =>
      `<tr><th scope="row" data-r="${r}">${dl}m</th>${prices.map((p, c) => p
        ? `<td><button type="button" class="cell" data-r="${r}" data-c="${c}" style="--i:${r + c}"
             aria-label="${g.wl[c]} by ${dl} metres, ${fmt(p)}" aria-pressed="false">${fmt(p)}</button></td>`
        : `<td class="na" aria-label="Not available">–</td>`).join('')}</tr>`).join('');
    el.sizeScroll.innerHTML = `<table class="sizes"><caption class="visually-hidden" hidden>Sizes and prices for the ${m.name}</caption><thead>${head}</thead><tbody>${body}</tbody></table>`;
    el.sizeScroll.scrollLeft = 0;
  }

  function markSize() {
    const t = $('table.sizes', el.sizeScroll);
    if (!t) return;
    t.querySelectorAll('.cell.on').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
    t.querySelectorAll('th.sel').forEach(th => th.classList.remove('sel'));
    if (!state.size) return;
    const { r, c } = state.size;
    const b = t.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (b) { b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); }
    t.querySelector(`thead th[data-c="${c}"]`)?.classList.add('sel');
    t.querySelector(`tbody th[data-r="${r}"]`)?.classList.add('sel');
  }

  /* ---------- Main render ---------- */
  function renderMain() {
    el.secRange.classList.toggle('compact', !!state.range);
    markSelected(el.rangeCards, state.range);

    el.secModel.hidden = !state.range;
    if (state.range && rendered.range !== state.range) { renderModelCards(); }
    rendered.range = state.range;
    el.secModel.classList.toggle('compact', !!state.model);
    markSelected(el.modelCards, state.model);

    el.secSize.hidden = !state.model;
    if (state.model && rendered.model !== state.model) renderSizes();
    rendered.model = state.model;
    markSize();

    // keep the picked chip visible inside narrow compact strips
    [el.rangeCards, el.modelCards].forEach(strip => {
      const on = strip.querySelector('.card.on');
      if (on && strip.scrollWidth > strip.clientWidth) {
        strip.scrollLeft = on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2;
      }
    });
  }

  /* ---------- Cart ---------- */
  const lineEls = Object.fromEntries([...el.lines.children].map(li => [li.dataset.step, li]));
  const STEP_LABEL = { range: 'Range', model: 'Model', size: 'Size' };

  function lineData(step) {
    if (step === 'range' && state.range) {
      const r = rangeByKey(state.range);
      return { key: r.key, thumb: IMG_BASE + r.img, title: r.name, sub: 'Range' };
    }
    if (step === 'model' && state.model) {
      const m = modelById(state.model);
      return { key: m.id, thumb: IMG_BASE + m.img, title: m.name, sub: rangeByKey(state.range).name };
    }
    if (step === 'size' && state.size) {
      const s = state.size;
      return { key: `${state.model}:${s.key}`, thumb: s.img, cover: true, title: `${s.wl} × ${s.dl}m`,
               sub: `${s.area} m² floor area` };
    }
    return null;
  }

  function setLine(step, isNext) {
    const li = lineEls[step];
    const d = lineData(step);
    const key = d ? d.key : 'ghost';
    li.classList.toggle('next', !d && isNext);
    if (li.dataset.key === key) return;
    const wasFilled = li.dataset.key && li.dataset.key !== 'ghost';
    li.dataset.key = key;
    li.classList.toggle('ghost', !d);
    li.innerHTML = d
      ? `<div class="line-inner">
           <span class="line-thumb${d.cover ? ' cover' : ''}"><img src="${d.thumb}" alt=""></span>
           <span><span class="line-step">${STEP_LABEL[step]}</span><span class="line-title">${d.title}</span><span class="line-sub">${d.sub}</span></span>
         </div>`
      : `<div class="line-inner">
           <span class="line-thumb"></span>
           <span><span class="line-step">${STEP_LABEL[step]}</span><span class="line-title">${isNext ? 'Choose a ' + step : 'Not chosen yet'}</span></span>
         </div>`;
    if (reduceMotion) return;
    const inner = li.firstElementChild;
    if (d) {
      inner.animate([{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      li.animate([{ backgroundColor: '#edf1ed' }, { backgroundColor: 'rgba(237,241,237,0)' }], { duration: 900, easing: 'ease-out' });
    } else if (wasFilled) {
      inner.animate([{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 300, easing: 'ease-out' });
    }
  }

  let heroSrc = null;
  function setHero() {
    let src = null, thumb = true;
    if (state.size) { src = state.size.img; thumb = false; }
    else if (state.model) src = IMG_BASE + modelById(state.model).img;
    else if (state.range) src = IMG_BASE + rangeByKey(state.range).img;
    if (src === heroSrc) return;
    heroSrc = src;
    const olds = [...el.hero.querySelectorAll('.hero-img')];
    el.hero.classList.toggle('has-img', !!src);
    const fadeOut = () => olds.forEach(o => {
      if (reduceMotion) return o.remove();
      o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished.then(() => o.remove());
    });
    if (!src) { fadeOut(); return; }
    const img = new Image();
    img.className = 'hero-img' + (thumb ? ' is-thumb' : '');
    img.alt = '';
    img.src = src;
    const show = () => {
      if (heroSrc !== src) return;
      el.hero.appendChild(img);
      if (!reduceMotion) img.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }],
        { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
      fadeOut();
    };
    img.decode ? img.decode().then(show, show) : (img.onload = show);
  }

  /* animated total */
  let shownTotal = 0, totalAnim = 0;
  function tweenTotal(to) {
    cancelAnimationFrame(totalAnim);
    if (to == null) { shownTotal = 0; el.total.textContent = '—'; el.sum.textContent = '—'; return; }
    const from = shownTotal || to * 0.9, t0 = performance.now(), dur = reduceMotion ? 1 : 500;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      shownTotal = from + (to - from) * e;
      el.total.textContent = fmt(shownTotal);
      if (p < 1) totalAnim = requestAnimationFrame(step); else shownTotal = to;
    };
    totalAnim = requestAnimationFrame(step);
  }

  function renderCart() {
    const nextStep = !state.range ? 'range' : !state.model ? 'model' : !state.size ? 'size' : null;
    ['range', 'model', 'size'].forEach(s => setLine(s, s === nextStep));
    setHero();

    let total = null;
    if (state.size) total = state.size.price;
    else if (state.model) total = modelById(state.model).from;
    else if (state.range) total = rangeByKey(state.range).from;
    tweenTotal(total);

    el.totalFrom.textContent = total != null && !state.size ? 'From' : '';
    el.totalLabel.textContent = state.model ? `${modelById(state.model).name}${state.size ? ' · ' + state.size.wl + ' × ' + state.size.dl + 'm' : ''}` : state.range ? rangeByKey(state.range).name : 'Your garden room';
    el.totalNote.textContent = state.size ? 'Base price inc. VAT · sample price'
      : state.range ? 'Starting price inc. VAT · choose a size for an exact price'
      : 'Pick a range to see prices';
    el.sum.textContent = state.size ? fmt(state.size.price) : total != null ? 'from ' + fmt(total) : '—';

    const ready = !!state.size;
    const wasReady = !el.configure.disabled;
    el.configure.disabled = !ready;
    if (ready && !wasReady && !reduceMotion) {
      el.configure.classList.remove('ready'); void el.configure.offsetWidth; el.configure.classList.add('ready');
    }
    if (!ready) el.configure.classList.remove('ready');
    el.footNote.textContent = ready ? 'Doors, windows and finishes are chosen next'
      : nextStep === 'range' ? 'Choose a range, model and size to continue'
      : `Next: choose a ${nextStep}`;
    el.reset.hidden = !state.range;
  }

  /* ---------- Actions ---------- */
  function scrollTopInstant() { window.scrollTo({ top: 0, behavior: 'instant' }); }

  function pickRange(key) {
    if (state.range === key) return;
    transition(() => {
      state.range = key; state.model = null; state.size = null;
      renderMain(); renderCart(); scrollTopInstant();
    });
  }

  function pickModel(id) {
    if (state.model === id) return;
    transition(() => {
      state.model = id; state.size = null;
      renderMain(); renderCart(); scrollTopInstant();
    });
  }

  function pickSize(r, c) {
    const m = modelById(state.model), g = GRIDS[m.grid];
    const [dl, dmm, prices] = g.rows[r];
    const wmm = g.wmm[c];
    state.size = {
      r, c, key: `${wmm}x${dmm}`, wl: g.wl[c], dl, price: prices[c],
      area: (wmm * dmm / 1e6).toFixed(1),
      img: `${IMG_BASE}sizes/${m.id}/${wmm}x${dmm}.webp`
    };
    markSize(); renderCart();
  }

  function reset() {
    transition(() => {
      state.range = state.model = state.size = null;
      renderMain(); renderCart(); scrollTopInstant();
    });
  }

  /* ---------- Events ---------- */
  el.rangeCards.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) pickRange(c.dataset.id); });
  el.modelCards.addEventListener('click', e => { const c = e.target.closest('.card'); if (c) pickModel(c.dataset.id); });
  el.sizeScroll.addEventListener('click', e => {
    const b = e.target.closest('.cell'); if (b) pickSize(+b.dataset.r, +b.dataset.c);
  });

  // crosshair highlight + image preload on hover
  el.sizeScroll.addEventListener('pointerover', e => {
    const t = $('table.sizes', el.sizeScroll); if (!t) return;
    t.querySelectorAll('th.hl').forEach(th => th.classList.remove('hl'));
    const b = e.target.closest('.cell'); if (!b) return;
    t.querySelector(`thead th[data-c="${b.dataset.c}"]`)?.classList.add('hl');
    t.querySelector(`tbody th[data-r="${b.dataset.r}"]`)?.classList.add('hl');
    const m = modelById(state.model), g = GRIDS[m.grid];
    new Image().src = `${IMG_BASE}sizes/${m.id}/${g.wmm[b.dataset.c]}x${g.rows[b.dataset.r][1]}.webp`;
  });
  el.sizeScroll.addEventListener('pointerleave', () =>
    el.sizeScroll.querySelectorAll('th.hl').forEach(th => th.classList.remove('hl')));

  el.reset.addEventListener('click', reset);

  let toastTimer;
  el.configure.addEventListener('click', () => {
    if (!state.size) return;
    const m = modelById(state.model);
    el.toast.textContent = `Prototype ends here — would open the configurator with ${m.name}, ${state.size.wl} × ${state.size.dl}m (${fmt(state.size.price)}).`;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 4000);
  });

  /* ---------- Init ---------- */
  renderRangeCards();
  renderMain();
  renderCart();
})();
