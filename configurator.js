/* Green Retreats – configurator shell prototype.
   Reads the wizard's choice from the URL (?model=<id>&r=<depth row>&c=<width col>)
   and lays out the empty configurator chrome around it. */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const fmt = n => '£' + Math.round(n).toLocaleString('en-GB');
  const FINANCE_RATE = 317 / 27263.93; // sample monthly-to-price ratio seen on staging

  const STEPS = [
    { label: 'Style',           title: 'Style',                   sub: 'Choose the style of building.' },
    { label: 'Size',            title: 'Size',                    sub: 'Width, depth and height, frame colour and foundations.' },
    { label: 'Doors & windows', title: 'Doors & windows',         sub: 'Add doors and windows, then click one to change it.' },
    { label: 'Exterior',        title: 'Exterior',                sub: 'Cladding, roof, decking and the garden around it.' },
    { label: 'Interior',        title: 'Interior',                sub: 'Rooms, finishes, fittings and furniture.' },
    { label: 'Plan',            title: 'Floor & electrical plan', sub: 'Sockets, switches, lights and services on the plan.' },
    { label: 'Delivery',        title: 'Delivery & install',      sub: 'Where it is going and how we get it there.' },
    { label: 'Summary',         title: 'Summary',                 sub: 'Your price, specification and next steps.' }
  ];

  /* ---------- Design from the wizard (falls back to B1 3.68 × 3.36m) ---------- */
  const params = new URLSearchParams(location.search);
  const allModels = Object.values(MODELS).flat();
  let model = allModels.find(m => m.id === params.get('model')) || allModels.find(m => m.id === 'b1') || allModels[0];
  const g = GRIDS[model.grid];
  let r = +params.get('r'), c = +params.get('c');
  if (!g.rows[r] || !g.rows[r][2][c]) { r = Math.min(1, g.rows.length - 1); c = Math.min(2, g.wl.length - 1); }
  const design = { name: model.name, wl: g.wl[c], dl: g.rows[r][0], price: g.rows[r][2][c] };

  /* ---------- Top bar ---------- */
  $('#dc-model').textContent = design.name;
  $('#dc-size').textContent = `${design.wl}m × ${design.dl}m`;
  const now = new Date();
  $('#saved').textContent = `Saved locally ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  /* ---------- Price / VAT ---------- */
  let exVat = false;
  function renderPrice() {
    const inc = design.price, ex = inc / 1.2;
    $('#pf-price').textContent = fmt(exVat ? ex : inc);
    $('#pf-vat').textContent = exVat ? `ex. VAT · ${fmt(inc)} inc. VAT` : `inc. VAT · ${fmt(ex)} ex. VAT`;
    const monthly = fmt(inc * FINANCE_RATE);
    $('#finance-top-amt').textContent = monthly;
    $('#finance-foot-amt').textContent = monthly;
    $('#vat-toggle').setAttribute('aria-pressed', exVat);
  }
  $('#vat-toggle').addEventListener('click', () => { exVat = !exVat; renderPrice(); });

  /* ---------- Steps ---------- */
  // Style and size were chosen in the wizard, so the configurator opens on Doors & windows.
  let current = 2;
  const done = new Set([0, 1]);
  const stepsEl = $('#steps');
  stepsEl.innerHTML = STEPS.map((s, i) =>
    `<li><button type="button" class="step" data-i="${i}" aria-label="${s.title}: ${s.sub}">
       <span class="step-num">${i + 1}</span><span class="step-label">${s.label}</span>
     </button></li>`).join('');
  const stepBtns = [...stepsEl.querySelectorAll('.step')];

  function goTo(i) {
    if (i < 0 || i >= STEPS.length) return;
    if (i > current) for (let k = current; k < i; k++) done.add(k);
    current = i;
    renderSteps();
  }

  function renderSteps() {
    const s = STEPS[current];
    stepBtns.forEach((b, i) => {
      b.classList.toggle('on', i === current);
      b.classList.toggle('done', done.has(i) && i !== current);
      b.classList.toggle('near', Math.abs(i - current) === 1);
      b.toggleAttribute('aria-current', i === current);
    });
    $('#ph-step').textContent = `Step ${current + 1} of ${STEPS.length}`;
    $('#ph-title').textContent = s.title;
    $('#ph-sub').textContent = s.sub;
    $('#body-placeholder').textContent = `${s.title} options`;
    $('#step-prev').disabled = current === 0;
    $('#step-next').disabled = current === STEPS.length - 1;
    stepBtns[current].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  stepsEl.addEventListener('click', e => { const b = e.target.closest('.step'); if (b) goTo(+b.dataset.i); });
  $('#step-prev').addEventListener('click', () => goTo(current - 1));
  $('#step-next').addEventListener('click', () => goTo(current + 1));
  $('#summary-btn').addEventListener('click', () => goTo(STEPS.length - 1));

  /* ---------- Simple toggles (visual only) ---------- */
  document.querySelectorAll('.tool-group').forEach(group => {
    group.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.dataset.menu || b.parentElement !== group) return;
      // view-mode groups (3D/Plan, Outside/Roof off/Inside) are single-select
      const exclusive = [...group.children].some(x => x.classList.contains('on'));
      if (!exclusive) return;
      setOn(group, b);
      if (group.querySelector('[data-menu="elevations"]')) MENUS.elevations.items.forEach(i => { i.checked = false; });
    });
  });

  /* ---------- View toolbar dropdowns (options mirror the live configurator) ---------- */
  function setOn(group, b) {
    [...group.children].forEach(x => {
      x.classList.toggle('on', x === b);
      if (!x.dataset.menu) x.setAttribute('aria-pressed', x === b);
    });
  }

  // Small 20×20 line icons. `hl` paths are drawn heavier to pick out a side.
  const side = d => `<rect x="5" y="5" width="10" height="10" rx="1" opacity=".45"/><path class="hl" d="${d}"/>`;
  // camera views: the building, its seen side picked out, and an arrow looking at it
  const look = (edge, arrow) => `<rect x="5.5" y="5.5" width="9" height="9" rx="1" opacity=".45"/><path class="hl" d="${edge}"/><path class="acc" d="${arrow}"/>`;
  const ICON = {
    front: side('M5 15h10'), rear: side('M5 5h10'), left: side('M5 5v10'), right: side('M15 5v10'),
    threeq: '<path d="M10 2.5 3.5 6v8l6.5 3.5 6.5-3.5V6z"/><path d="M3.5 6 10 9.5 16.5 6M10 9.5v8"/>',
    vfront: look('M5.5 14.5h9', 'M10 19.5v-2.75M8.5 18.25 10 16.75l1.5 1.5'),
    vrear:  look('M5.5 5.5h9',  'M10 .5v2.75M8.5 1.75 10 3.25l1.5-1.5'),
    vleft:  look('M5.5 5.5v9',  'M.5 10h2.75M1.75 8.5 3.25 10l-1.5 1.5'),
    vright: look('M14.5 5.5v9', 'M19.5 10h-2.75M18.25 8.5 16.75 10l1.5 1.5'),
    top: '<rect x="4" y="4" width="12" height="12" rx="1" opacity=".45"/><circle cx="10" cy="10" r="2.5"/><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2"/>',
    rotl: '<path d="M4.5 9.5a5.75 5.75 0 1 1 1.7 4.6"/><path d="M4.5 5.25v4.25h4.25"/>',
    rotr: '<path d="M15.5 9.5a5.75 5.75 0 1 0-1.7 4.6"/><path d="M15.5 5.25v4.25h-4.25"/>',
    fit: '<path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M13 3h2.5A1.5 1.5 0 0 1 17 4.5V7M17 13v2.5a1.5 1.5 0 0 1-1.5 1.5H13M7 17H4.5A1.5 1.5 0 0 1 3 15.5V13"/><rect x="7" y="7" width="6" height="6" rx="1"/>',
    doors: '<path d="M4.5 17V3h9v14M2.5 17h15"/><path d="M4.5 3l5 1.75V18.5l-5-1.5"/><path d="M8 10.5v1.25"/>',
    dims: '<path d="M2.5 4.5v5M17.5 4.5v5M2.5 7h15M5 5.25 2.75 7 5 8.75M15 5.25 17.25 7 15 8.75"/><path d="M3 12.5h14v4H3zM6 12.5v1.75M9 12.5v2.25M12 12.5v1.75M15 12.5v1.75" opacity=".7"/>',
    studio: '<path d="M3 3.5h14v7.25A5.75 5.75 0 0 1 11.25 16.5H3z"/><path d="M3 12.5h7"/>',
    grid: '<rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M7.67 3v14M12.33 3v14M3 7.67h14M3 12.33h14"/>',
    garden: '<path d="M10 17.5v-6"/><path d="M10 11.5c-3.25 0-5-1.9-5-4.25S7.25 2.5 10 2.5s5 2.4 5 4.75-1.75 4.25-5 4.25z"/><path d="M3 17.5h14"/>',
    pan: '<path d="M10 2.5v15M2.5 10h15M7.75 4.75 10 2.5l2.25 2.25M7.75 15.25 10 17.5l2.25-2.25M4.75 7.75 2.5 10l2.25 2.25M15.25 7.75 17.5 10l-2.25 2.25"/>'
  };

  // type: 'check' (on/off), 'radio' (one per group), 'action' (does something, closes the menu).
  // closeOnPick: single-choice menus shut once something is chosen.
  const MENUS = {
    elevations: { closeOnPick: true, items: [
      { label: 'Front elevation', icon: 'front', type: 'radio', group: 'elev' },
      { label: 'Rear elevation',  icon: 'rear',  type: 'radio', group: 'elev' },
      { label: 'Left elevation',  icon: 'left',  type: 'radio', group: 'elev' },
      { label: 'Right elevation', icon: 'right', type: 'radio', group: 'elev' }
    ] },
    camera: { closeOnPick: true, items: [
      { label: '3/4 view', icon: 'threeq', type: 'radio', group: 'view', checked: true },
      { label: 'Front',    icon: 'vfront', type: 'radio', group: 'view' },
      { label: 'Rear',     icon: 'vrear',  type: 'radio', group: 'view' },
      { label: 'Left',     icon: 'vleft',  type: 'radio', group: 'view' },
      { label: 'Right',    icon: 'vright', type: 'radio', group: 'view' },
      { label: 'Top',      icon: 'top',    type: 'radio', group: 'view' },
      { heading: 'Turn' },
      // turning moves off a preset view, so it clears the tick
      { label: 'Rotate left',  icon: 'rotl', type: 'action', clears: 'view' },
      { label: 'Rotate right', icon: 'rotr', type: 'action', clears: 'view' },
      { label: 'Fit the building in view', icon: 'fit', type: 'action' }
    ] },
    show: { items: [
      { label: 'Doors & windows open', icon: 'doors', type: 'check' },
      { label: 'Dimensions', icon: 'dims', type: 'check' },
      { heading: 'Setting' },
      { label: 'Studio',      icon: 'studio', type: 'radio', group: 'setting', checked: true },
      { label: 'Design grid', icon: 'grid',   type: 'radio', group: 'setting' },
      { label: 'Garden',      icon: 'garden', type: 'radio', group: 'setting' },
      { heading: 'Mouse' },
      { label: 'Pan (drag slides the view)', icon: 'pan', type: 'check' }
    ] }
  };

  const viewer = $('.viewer');
  const menuEl = document.createElement('div');
  menuEl.className = 'menu';
  menuEl.setAttribute('role', 'menu');
  menuEl.hidden = true;
  viewer.appendChild(menuEl);
  let openBtn = null;

  function renderMenu(key) {
    menuEl.innerHTML = MENUS[key].items.map((it, i) => it.heading
      ? `<div class="menu-heading" role="presentation">${it.heading}</div>`
      : `<button type="button" class="menu-item" data-i="${i}" tabindex="-1"
           role="${it.type === 'check' ? 'menuitemcheckbox' : it.type === 'radio' ? 'menuitemradio' : 'menuitem'}"
           ${it.type === 'action' ? '' : `aria-checked="${!!it.checked}"`}>
           <svg class="menu-icon" viewBox="0 0 20 20" aria-hidden="true">${ICON[it.icon]}</svg>
           <span class="menu-label">${it.label}</span>
           ${it.type === 'action' ? '' : '<span class="menu-check" aria-hidden="true"></span>'}
         </button>`).join('');
  }

  function openMenu(btn) {
    if (openBtn) closeMenu(false);
    openBtn = btn;
    menuEl.dataset.menu = btn.dataset.menu;
    menuEl.setAttribute('aria-label', btn.dataset.tip);
    renderMenu(btn.dataset.menu);
    const v = viewer.getBoundingClientRect(), b = btn.getBoundingClientRect();
    menuEl.hidden = false;
    // keep the menu inside the viewer on narrow screens
    const left = Math.min(b.left - v.left, v.width - menuEl.offsetWidth - 8);
    menuEl.style.left = `${Math.max(8, left)}px`;
    menuEl.style.top = `${b.bottom - v.top + 8}px`;
    btn.setAttribute('aria-expanded', 'true');
    menuEl.querySelector('.menu-item')?.focus({ preventScroll: true });
  }

  function closeMenu(returnFocus = true) {
    if (!openBtn) return;
    menuEl.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) openBtn.focus({ preventScroll: true });
    openBtn = null;
  }

  // The Elevations button lights up while an elevation is chosen (3D / Plan go off)
  function syncElevations() {
    const btn = $('[data-menu="elevations"]'), group = btn.parentElement;
    if (MENUS.elevations.items.some(i => i.checked)) setOn(group, btn);
    else if (btn.classList.contains('on')) setOn(group, group.children[0]);
  }

  document.querySelectorAll('[data-menu]').forEach(btn => btn.addEventListener('click', () => {
    openBtn === btn ? closeMenu() : openMenu(btn);
  }));

  menuEl.addEventListener('click', e => {
    const el = e.target.closest('.menu-item'); if (!el) return;
    const key = menuEl.dataset.menu, items = MENUS[key].items, it = items[+el.dataset.i];
    if (it.type === 'action') {
      if (it.clears) items.forEach(x => { if (x.group === it.clears) x.checked = false; });
      closeMenu(); return;
    }
    if (it.type === 'radio') items.forEach(x => { if (x.group === it.group) x.checked = x === it; });
    else it.checked = !it.checked;
    menuEl.querySelectorAll('.menu-item[aria-checked]').forEach(m => m.setAttribute('aria-checked', !!items[+m.dataset.i].checked));
    if (key === 'elevations') syncElevations();
    if (MENUS[key].closeOnPick) closeMenu();
  });

  menuEl.addEventListener('keydown', e => {
    const list = [...menuEl.querySelectorAll('.menu-item')];
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(); }
  });
  document.addEventListener('pointerdown', e => {
    if (openBtn && !menuEl.contains(e.target) && !openBtn.contains(e.target)) closeMenu(false);
  });
  window.addEventListener('resize', () => closeMenu(false));

  /* "/" jumps to search */
  const search = $('#search');
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) { e.preventDefault(); search.focus(); }
    else if (e.key === 'Escape' && document.activeElement === search) { search.value = ''; search.blur(); }
  });

  renderPrice();
  renderSteps();
})();
