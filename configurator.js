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
  document.querySelectorAll('.tool-group, .seg').forEach(group => {
    group.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.querySelector('.caret') || b.parentElement !== group) return;
      // view-mode groups (3D/Plan, Outside/Roof off/Inside, units, mode) are single-select
      const exclusive = [...group.children].some(x => x.classList.contains('on'));
      if (!exclusive) return;
      [...group.children].forEach(x => { x.classList.toggle('on', x === b); if (x.tagName === 'BUTTON') x.setAttribute('aria-pressed', x === b); });
    });
  });

  renderPrice();
  renderSteps();
})();
