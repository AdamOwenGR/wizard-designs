/* Green Retreats – configurator sidebar options (prototype).
   Every step's options from the live staging sidebar, laid out as one compact accordion per step:
   closed rows show the current choice and its price, only one section opens at a time, and the
   search box finds options across every step. Prices are the staging SAMPLE price book (ex. VAT,
   shown here inc. VAT) and are for demonstration only. */
window.Panel = (() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const fmt = n => '£' + Math.round(n).toLocaleString('en-GB');
  const fmt2 = n => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const VAT = 1.2;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  let api, container, current = null, query = '';

  /* ---------- Selections (defaults as on staging) ---------- */
  const sel = {
    height: 'standard', frame: 'graphite', foundSys: 'pile', foundPack: 'none',
    dwFilter: 'all', doors: ['slide-18'],
    cladding: 'redwood', paint: 'primed',
    deck_front: 'full', deck_rear: 'none', deck_left: 'none', deck_right: 'none', deckMat: 'redwood',
    downpipe: 'centre', cheekL: 'none', cheekR: 'none', handles: 'black',
    surroundings: true, scene: null, keepAdded: true, garden: {}, photoAs: 'backdrop', photo: null,
    flooring: 'light-oak', floorColour: 'oak', insulation: 'rockwool', wallFinish: 'standard', skirting: 'white',
    slatted: 'none', slattedWalls: ['rear'], cork: [],
    doorSet: 'none', doorQty: 0, partitionM: 0, kitchen: 'no', kitchenSide: 'right', shelves: '0', winter: 'none',
    blindsDW: 'none', blindsSliding: 'none', blindsFrench: 'none',
    layout: null, keepFurniture: true, furniture: {},
    q_panel: 0, q_circle: 0, q_bar: 0, q_oil: 0, q_heater15: 0, q_heater2: 0, q_aircon: 0, acInstall: 'standard',
    elecPack: 'none', consumer: '2', q_socket: 0, q_outSingle: 0, q_outDouble: 0, q_ethernet: 0,
    wifi: 'none', cat6: 'none', extStyle: 'solar', q_extLight: 0, extConn: 'none',
    q_switch1: 0, q_switch2: 0, q_cu: 1, q_condenser: 0, autoPlace: true,
    postcode: '', miles: '', access: 'standard',
    designName: 'My garden room', notes: ''
  };

  /* ---------- Geometry from the chosen size ---------- */
  const HEIGHT_UP = { standard: 0, extended: 200, max: 500 };
  function geo() {
    const d = api.design();
    const W = d.wmm / 1000, D = d.dmm / 1000;
    const hF = (2235 + HEIGHT_UP[sel.height]) / 1000, hR = hF - 0.19, hAvg = (hF + hR) / 2;
    return {
      W, D, hF, hR, area: W * D, perim: 2 * (W + D),
      walls: 2 * (W + D) * hAvg, ceil: W * D,
      wall: { front: W * hF, rear: W * hR, left: D * hAvg, right: D * hAvg }
    };
  }

  /* ---------- Data ---------- */
  const CLADDING = [
    { group: 'Timber' },
    { v: 'redwood',         name: 'Redwood',         img: 'Redwood_D.jpg',         price: 0 },
    { v: 'redwood-slatted', name: 'Slatted redwood', img: 'Redwood_Slatted_D.jpg', price: 0, zero: true },
    { v: 'honey',           name: 'Honey',           img: 'Honey_D.jpg',           price: 595.33 },
    { v: 'honey-slatted',   name: 'Slatted honey',   img: 'Honey_Slatted_D.jpg',   price: 595.33 },
    { v: 'cedar',           name: 'Cedar',           img: 'Cedar_D.jpg',           price: 2870.92 },
    { group: 'Composite' },
    { v: 'composite-oak',   name: 'Composite oak',   img: 'Composite_Oak_D.jpg',   price: 1913.29 },
    { v: 'composite-black', name: 'Composite black', img: 'Composite_D.jpg',       price: 2227.64 },
    { v: 'composite-grey',  name: 'Composite grey',  img: 'Composite_Grey_D.jpg',  price: 2227.64 },
    { v: 'composite-cedar', name: 'Composite cedar', img: 'Composite_Cedar_D.jpg', price: 2471.32 },
    { group: 'Metal' },
    { v: 'standing-seam',   name: 'Standing seam',   art: 'swatch-seam',           price: 3507.67 }
  ];
  const PAINT = [
    { v: 'primed',       name: 'Primed only',  sub: 'Ready for you to paint', color: '#e6e1d6', price: 0 },
    { v: 'green-glade',  name: 'Green glade',  sub: 'You paint',              color: '#56664f', price: 672 },
    { v: 'gallant-grey', name: 'Gallant grey', sub: 'You paint',              color: '#77796f', price: 672 },
    { v: 'garden-grey',  name: 'Garden grey',  sub: 'You paint',              color: '#9a9d92', price: 672 },
    { v: 'black',        name: 'Black',        sub: 'You paint',              color: '#2a2b29', price: 672 }
  ];
  const DOORS = [
    { v: 'single',     kind: 'door',   name: 'Single door',          sub: 'Fully glazed', w: 915,  h: 2070, slots: 3,  price: 1620 },
    { v: 'slide-18',   kind: 'slide',  name: 'Sliding doors (1.8m)', w: 1830, h: 2070, slots: 6,  price: 3245.40 },
    { v: 'slide-24',   kind: 'slide',  name: 'Sliding doors (2.4m)', w: 2440, h: 2070, slots: 8,  price: 4087.20 },
    { v: 'slide-30',   kind: 'slide',  name: 'Sliding doors (3.0m)', w: 3050, h: 2070, slots: 10, price: 4929 },
    { v: 'french-15',  kind: 'french', name: 'French doors (1.5m)',  w: 1525, h: 2070, slots: 5,  price: 2973 },
    { v: 'french-18',  kind: 'french', name: 'French doors (1.8m)',  w: 1830, h: 2070, slots: 6,  price: 3375.60 },
    { v: 'french-24',  kind: 'french', name: 'French doors (2.4m)',  w: 2440, h: 2070, slots: 8,  price: 4180.80 },
    { v: 'lozenge',    kind: 'window', name: 'Lozenge window (medium)', sub: 'Top-hung', w: 905, h: 440, slots: 4, price: 584.47 },
    { v: 'win-small',  kind: 'window', name: 'Small opening window',    sub: 'Top-opening', w: 610, h: 915, slots: 2, price: 684.29 },
    { v: 'fh-small',   kind: 'tall',   name: 'Small full height window', sub: 'Non-opening', w: 610, h: 2070, slots: 2, price: 958.80 },
    { v: 'fh-large',   kind: 'tall',   name: 'Large full height window', sub: 'Non-opening', w: 915, h: 2070, slots: 3, price: 1288.20 },
    { v: 'fh-small-o', kind: 'tall',   name: 'Small full height opening window', sub: 'Top-opening', w: 610, h: 2070, slots: 2, price: 1123.92 },
    { v: 'fh-large-o', kind: 'tall',   name: 'Large full height opening window', sub: 'Top-opening', w: 915, h: 2070, slots: 3, price: 1517.89 }
  ];
  const doorBy = v => DOORS.find(d => d.v === v);
  const isDoor = d => ['door', 'slide', 'french'].includes(d.kind);
  const FLOORING = [
    { group: 'Laminate' },
    { v: 'light-oak',   name: 'Light oak',    color: '#c9a77c', price: 0 },
    { v: 'grey-oak',    name: 'Grey oak',     color: '#9c9690', price: 0 },
    { v: 'dark-oak',    name: 'Dark oak',     color: '#6b4c35', price: 0 },
    { v: 'white-wash',  name: 'White washed', color: '#e3dccf', price: 0 },
    { group: 'Other floors' },
    { v: 'carpet',      name: 'Carpet tiles', color: '#6e6f6c', price: 0 },
    { v: 'eng-straight', name: 'Engineered straight boards',   color: '#b0855a', perM2: 95 },
    { v: 'eng-herring',  name: 'Engineered herringbone boards', color: '#a87c52', perM2: 95, art: 'art-herring' },
    { v: 'none',        name: 'No flooring',  sub: 'Fit your own', color: '#d9d6cf', price: 0, zero: true }
  ];
  const SLATS = [
    { v: 'none',         name: 'None',         color: '#efeeeb' },
    { v: 'pewter-blue',  name: 'Pewter blue',  color: '#5c6b78' },
    { v: 'classic-oak',  name: 'Classic oak',  color: '#b38b5d' },
    { v: 'siberian-oak', name: 'Siberian oak', color: '#d2b48a' }
  ];
  const WALLS = [['front', 'Front'], ['rear', 'Rear'], ['left', 'Left'], ['right', 'Right']];
  const SETTINGS = [
    { v: 'Studio', sub: 'Soft, plain backdrop' },
    { v: 'Design grid', sub: 'Pale floor with a grid' },
    { v: 'Garden', sub: 'Lawn under a blue sky' }
  ];
  const SCENES = [
    ['Lawn garden', 'Grass, a fence behind, trees, bushes and a bench.'],
    ['Terrace and lawn', 'Concrete base, paved path, table and chairs, planters.'],
    ['Woodland edge', 'Lawn, a hedge, conifers, trees and gravel.'],
    ['Cottage garden', 'Flower beds, small trees, a low fence and a bench.']
  ];
  const GARDEN = [
    ['Ground', ['Grass all around', 'Concrete base', 'Lawn', 'Paving / path', 'Gravel', 'Concrete']],
    ['Trees', ['Large tree', 'Conifer', 'Small ornamental tree']],
    ['Planting', ['Bush', 'Hedge', 'Flower bed', 'Planter']],
    ['Water', ['Swimming pool', 'Pond']],
    ['Boundaries', ['Fence (1.8m)', 'Low fence', 'Garden wall']],
    ['Furniture & pets', ['Garden bench', 'Table and chairs', 'Dog']]
  ];
  const LAYOUTS = [
    ['Chill-out room', 'TV, sofa, coffee table, armchairs and table football.'],
    ['Home office', 'Desk and chair, bookcases, filing cabinet and a small sofa.'],
    ['Weights gym', 'Floor mat, half rack and bench, dumbbells, treadmill and bike.'],
    ['Yoga studio', 'Mats facing a mirror, cushions, plants and a cupboard.'],
    ['Bedroom', 'Double bed, bedside tables, wardrobe, rug and armchair.'],
    ['Games room', 'Pool table, table football, TV, sofa and a drinks fridge.'],
    ['Reading nook', 'Two armchairs, side table, bookcases and a floor lamp.']
  ];
  const FURNITURE = [
    ['Seating', ['Dining chair', 'Office chair', 'Stool', 'Armchair', 'Sofa, 2 seats', 'Sofa, 3 seats', 'Bean bag']],
    ['Tables', ['Dining table', 'Round table', 'Coffee table', 'Side table', 'Desk']],
    ['Beds', ['Single bed', 'Double bed']],
    ['Storage', ['Bookcase', 'Wardrobe', 'Sideboard', 'TV unit', 'Filing cabinet', 'Drinks fridge']],
    ['Lighting & extras', ['Floor lamp', 'Table lamp', 'Rug', 'Plant']],
    ['Entertainment', ['Wall-mounted TV (55 in)', 'Table football', 'Pool table', 'Picture', 'Whiteboard', 'Lizard tank']],
    ['Fitness', ['Weights bench', 'Half rack', 'Dumbbell rack', 'Exercise bike', 'Treadmill', 'Gym floor mat', 'Yoga mat', 'Meditation cushion', 'Wall mirror']]
  ];
  const ZONES = [[50, 'Zone 1', 0], [100, 'Zone 2', 456], [200, 'Zone 3', 1260], [Infinity, 'Zone 4', 2640]];
  const DECK_DEPTH = 0.9, DOOR_DECK_W = 1.8;
  const DECK_RATE = { redwood: 140.84, cedar: 320.84, composite: 282.44 };   // £/m² inc. VAT (sample)
  const FINISH = { none: 'None', black: 'Black', 'grey-slatted': 'Grey slatted' };
  const SIDES = { front: 'Front', rear: 'Rear', left: 'Left', right: 'Right' };

  /* ---------- Small HTML builders ---------- */
  const ICON = {
    ruler: '<path d="M3 13.5 13.5 3l3.5 3.5L6.5 17z"/><path d="m6 11 1.5 1.5M8.5 8.5 10 10M11 6l1.5 1.5"/>',
    height: '<path d="M10 2.5v15M7 5l3-3 3 3M7 15l3 3 3-3"/>',
    frame: '<rect x="4" y="3" width="12" height="14" rx="1"/><rect x="7" y="6" width="6" height="8"/>',
    piles: '<path d="M2.5 9h15"/><path d="M5 9v8.5M10 9v8.5M15 9v8.5"/><path d="M2.5 5.5h15"/>',
    pack: '<path d="M3 7.5h14v9H3zM3 7.5 5 3.5h10l2 4"/><path d="M10 3.5v4"/>',
    dims: '<path d="M3 6h14M3 4v4M17 4v4M6 10v7M4 10h4M4 17h4"/><rect x="10" y="10" width="7" height="7" rx=".5"/>',
    door: '<rect x="5" y="2.5" width="10" height="15" rx="1"/><path d="M12.25 10.5v.01"/>',
    list: '<path d="M7 5.5h10M7 10h10M7 14.5h10"/><circle cx="3.5" cy="5.5" r=".75"/><circle cx="3.5" cy="10" r=".75"/><circle cx="3.5" cy="14.5" r=".75"/>',
    gutter: '<path d="M2 8.5 10 4l8 4.5"/><path d="M3.5 8v8.5M16.5 8v8.5"/><path d="M16.5 10.5h1.25v6"/>',
    cheeks: '<path d="M5 3.5v13M15 3.5v13"/><path d="M2.5 6v8M17.5 6v8M2.5 8h2.5M2.5 12h2.5M15 8h2.5M15 12h2.5"/>',
    picture: '<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><path d="m2.5 13.5 4-4 3.5 3.5 2.5-2.5 5 5"/><circle cx="13" cy="7.25" r="1.25"/>',
    tree: '<path d="M10 17.5v-5"/><path d="M10 12.5c-3.25 0-5-1.9-5-4.25S7.25 3 10 3s5 2.9 5 5.25-1.75 4.25-5 4.25z"/><path d="M3 17.5h14"/>',
    camera: '<path d="M2.5 7A1.5 1.5 0 0 1 4 5.5h2L7.5 3.5h5L14 5.5h2A1.5 1.5 0 0 1 17.5 7v8A1.5 1.5 0 0 1 16 16.5H4A1.5 1.5 0 0 1 2.5 15z"/><circle cx="10" cy="10.75" r="3"/>',
    layers: '<path d="m10 3 7.5 4L10 11 2.5 7z"/><path d="m2.5 10.5 7.5 4 7.5-4"/><path d="m2.5 14 7.5 4 7.5-4"/>',
    wall: '<rect x="2.5" y="3.5" width="15" height="13" rx="1"/><path d="M2.5 8h15M2.5 12.5h15M7 3.5V8M13 8v4.5M8 12.5v4"/>',
    slats: '<rect x="3" y="3" width="14" height="14" rx="1"/><path d="M6.5 3v14M10 3v14M13.5 3v14"/>',
    pin: '<rect x="3" y="3.5" width="14" height="13" rx="1"/><circle cx="7.5" cy="8" r="1"/><circle cx="12.5" cy="11.5" r="1"/>',
    idoor: '<path d="M4 17.5V3.5h8v14M12 3.5l4 2v12l-4-.01"/><path d="M2.5 17.5h15"/>',
    partition: '<rect x="2.5" y="3.5" width="15" height="13" rx="1"/><path d="M10 3.5v6M10 13v3.5"/>',
    kitchen: '<rect x="3" y="8" width="14" height="9" rx="1"/><path d="M3 11h14M8 13v2M12 13v2M6 8V4.5M14 8V6"/>',
    shelf: '<path d="M3 6h14M3 11h14M3 16h14"/><path d="M5 6v-2.5M9 6V4M13 11V8.5M7 16v-3"/>',
    snow: '<path d="M10 2.5v15M3.5 6.25l13 7.5M3.5 13.75l13-7.5"/><path d="m8 4 2 1.5L12 4M8 16l2-1.5 2 1.5"/>',
    blind: '<rect x="3.5" y="3" width="13" height="14" rx="1"/><path d="M3.5 6h13M3.5 9h13M3.5 12h13M10 12v3"/>',
    sofa: '<path d="M4.5 10V8a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2"/><path d="M3 10.5a1.5 1.5 0 0 1 3 0V12h8v-1.5a1.5 1.5 0 0 1 3 0V15H3z"/><path d="M5 15v2M15 15v2"/>',
    sparkle: '<path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2 2M12.5 12.5l2 2M14.5 5.5l-2 2M7.5 12.5l-2 2"/>',
    bulb: '<path d="M7 14.5h6M8 17h4"/><path d="M10 2.5a5 5 0 0 0-3 9c.6.5 1 1.2 1 2V14h4v-.5c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z"/>',
    heat: '<rect x="3" y="5" width="14" height="10" rx="1.5"/><path d="M6.5 8v4M10 8v4M13.5 8v4M5 15v2M15 15v2"/>',
    snowflake: '<path d="M3 6h14v6H3z"/><path d="M5.5 9h9M7 15l-1 2.5M10 15v2.5M13 15l1 2.5"/>',
    plug: '<path d="M7 2.5v4M13 2.5v4"/><path d="M5 6.5h10v3a5 5 0 0 1-10 0z"/><path d="M10 14.5v3"/>',
    socket: '<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7.5 8v2M12.5 8v2M8 13h4"/>',
    wifi: '<path d="M2.5 8a11 11 0 0 1 15 0M5 11a7.5 7.5 0 0 1 10 0M7.5 14a4 4 0 0 1 5 0"/><circle cx="10" cy="16.5" r=".75"/>',
    sun: '<circle cx="10" cy="10" r="3.25"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/>',
    cable: '<path d="M3 15c4 0 3-10 7-10s3 10 7 10"/><circle cx="3" cy="15" r="1.25"/><circle cx="17" cy="15" r="1.25"/>',
    switch: '<rect x="4" y="2.5" width="12" height="15" rx="2"/><rect x="8" y="6" width="4" height="8" rx="1"/>',
    pinmap: '<path d="M10 17.5s-5.5-5-5.5-9a5.5 5.5 0 0 1 11 0c0 4-5.5 9-5.5 9z"/><circle cx="10" cy="8.5" r="2"/>',
    truck: '<path d="M1.75 5.5h10v8.25h-10zM11.75 8.5h3.5l3 3v2.25h-6.5"/><circle cx="5" cy="14.75" r="1.75"/><circle cx="14.75" cy="14.75" r="1.75"/>',
    crane: '<path d="M5 17.5V3.5h1.5M3 17.5h6M6.5 3.5h10l-10 4M14 3.5v5"/><rect x="12.5" y="8.5" width="3" height="2.5"/>',
    info: '<circle cx="10" cy="10" r="7.5"/><path d="M10 9v5M10 6.5v.01"/>',
    tag: '<path d="M2.5 10.5V3.5h7l8 8-7 7z"/><circle cx="6.5" cy="7.5" r="1.25"/>',
    pound: '<path d="M13.25 5.25a3.25 3.25 0 0 0-5.75 2.1V15.5M5.5 15.5h9M5.5 10.75h6"/>',
    note: '<path d="M4 2.5h9l3 3v12H4z"/><path d="M7 8h6M7 11h6M7 14h3.5"/>',
    send: '<path d="M17.5 2.5 2.5 9l6 2.5 2.5 6z"/><path d="m8.5 11.5 4-4"/>',
    share: '<circle cx="5" cy="10" r="2"/><circle cx="15" cy="4.5" r="2"/><circle cx="15" cy="15.5" r="2"/><path d="m6.75 9 6.5-3.5M6.75 11l6.5 3.5"/>',
    name: '<path d="M3 16.5h3l9-9-3-3-9 9z"/><path d="m10.5 6 3 3"/>'
  };
  const svg = p => `<svg viewBox="0 0 20 20" aria-hidden="true">${p}</svg>`;
  const priceText = (it, total) => it.tag != null ? it.tag
    : Math.round(total) === 0 ? (it.zero ? '£0' : 'Included') : '+' + fmt(total);

  // Radio list: rows with an image, swatch dot or tile, a name/sub line and a price
  function list(f, items, label, priceOf = it => it.price || 0) {
    return `<div class="opt-list" role="radiogroup" aria-label="${esc(label)}">${items.map(it => {
      if (it.group) return `<div class="clad-group" role="presentation">${it.group}</div>`;
      const on = String(sel[f]) === it.v, p = priceText(it, priceOf(it));
      const thumb = it.img ? `<span class="clad-thumb"><img src="img/cladding/${it.img}" alt="" loading="lazy"></span>`
        : it.art && !it.color ? `<span class="clad-thumb"><span class="swatch ${it.art}"></span></span>`
        : `<span class="sw-dot${it.art ? ' ' + it.art : ''}" style="--c:${it.color || '#efeeeb'}"></span>`;
      return `<button type="button" class="${it.img || (it.art && !it.color) ? 'clad-row' : 'sw-row'}${on ? ' on' : ''}" role="radio" aria-checked="${on}"
          tabindex="${on ? 0 : -1}" data-act="set" data-f="${f}" data-v="${it.v}" data-fid="${f}:${it.v}">
          ${thumb}
          <span class="sw-text"><span class="sw-name">${it.name}</span>${it.sub ? `<span class="sw-sub">${it.sub}</span>` : ''}</span>
          <span class="clad-price${/^(Included|£0)$/.test(p) ? ' is-zero' : ''}${on ? ' is-chosen' : ''}">${p}</span>
        </button>`;
    }).join('')}</div>`;
  }
  // Segmented control
  const seg = (f, opts, label, act = 'set') => `<div class="seg" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => {
    const on = String(sel[f]) === String(v);
    return `<button type="button" role="radio" class="${on ? 'on' : ''}" aria-checked="${on}" tabindex="${on ? 0 : -1}"
      data-act="${act}" data-f="${f}" data-v="${v}" data-fid="${f}:${v}">${l}</button>`;
  }).join('')}</div>`;
  const row = (label, html) => `<div class="seg-row"><span class="seg-label">${label}</span>${html}</div>`;
  const rows = (...r) => `<div class="seg-rows">${r.join('')}</div>`;
  const note = t => `<p class="opt-note">${t}</p>`;
  const lead = t => `<p class="acc-lead">${t}</p>`;
  const sub = t => `<h3 class="acc-sub">${t}</h3>`;
  // Multi-select chips (walls etc.)
  const multi = (f, opts, label) => `<div class="chips" role="group" aria-label="${esc(label)}">${opts.map(([v, l]) => {
    const on = sel[f].includes(v);
    return `<button type="button" class="chip chip-toggle${on ? ' on' : ''}" aria-pressed="${on}" data-act="toggle" data-f="${f}" data-v="${v}" data-fid="${f}:${v}">${l}</button>`;
  }).join('')}</div>`;
  // Stepper
  const stepper = (f, { min = 0, max = 20, step = 1, unit = '', label }) => {
    const v = +sel[f];
    return `<div class="qty" role="group" aria-label="${esc(label)}">
      <button type="button" data-act="inc" data-f="${f}" data-d="${-step}" data-min="${min}" data-max="${max}" data-fid="${f}:-" ${v <= min ? 'disabled' : ''} aria-label="Fewer">−</button>
      <output aria-live="polite">${v}${unit}</output>
      <button type="button" data-act="inc" data-f="${f}" data-d="${step}" data-min="${min}" data-max="${max}" data-fid="${f}:+" ${v >= max ? 'disabled' : ''} aria-label="More">+</button>
    </div>`;
  };
  // Quantity row: name, unit price, stepper
  const qtyRow = (f, name, subText, unit, max = 20) => `<div class="qty-row">
      <span class="sw-text"><span class="sw-name">${name}</span><span class="sw-sub">${subText || ''}${unit ? `${subText ? ' · ' : ''}${fmt2(unit)} each` : ''}</span></span>
      ${stepper(f, { max, label: name })}
    </div>`;
  // Add-item chips with counts (garden, furniture)
  const addChips = (f, groups) => groups.map(([g, items]) =>
    `<div class="chip-group"><span class="chip-group-label">${g}</span><div class="chips">${items.map(n => {
      const k = sel[f][n] || 0;
      return `<button type="button" class="chip${k ? ' on' : ''}" data-act="add" data-f="${f}" data-v="${esc(n)}" data-fid="${f}:${esc(n)}"
          aria-label="Add ${esc(n)}${k ? `, ${k} added` : ''}"><span class="chip-plus" aria-hidden="true">+</span>${n}${k ? `<span class="chip-count">${k}</span>` : ''}</button>`;
    }).join('')}</div></div>`).join('');
  // Cards (radio, or one-off actions such as example scenes)
  const cards = (f, items, cls = '') => `<div class="card-grid ${cls}">${items.map(([v, s, art]) => {
    const on = sel[f] === v;
    return `<button type="button" class="opt-card${on ? ' on' : ''}" aria-pressed="${on}" data-act="set" data-f="${f}" data-v="${esc(v)}" data-fid="${f}:${esc(v)}">
      ${art ? `<span class="opt-card-art ${art}"></span>` : ''}<span class="opt-card-name">${v}</span><span class="opt-card-sub">${s}</span></button>`;
  }).join('')}</div>`;
  const check = (f, label) => `<label class="check-row"><input type="checkbox" data-check="${f}" ${sel[f] ? 'checked' : ''}> ${label}</label>`;
  const toggle = (f, title, s) => `<label class="switch-row"><span><span class="switch-title">${title}</span>${s ? `<span class="switch-sub">${s}</span>` : ''}</span>
      <input type="checkbox" class="switch" data-check="${f}" ${sel[f] ? 'checked' : ''}></label>`;
  const kv = pairs => `<dl class="kv">${pairs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const action = (label, icon, msg) => `<button type="button" class="act-row" data-act="toast" data-v="${esc(msg || label + ' is simulated in this prototype.')}">
      <span class="acc-tile acc-tile-icon">${svg(ICON[icon])}</span><span class="sw-name">${label}</span><span class="act-chev" aria-hidden="true"></span></button>`;
  const field = (f, label, help, attrs = '') => `<label class="field"><span class="field-label">${label}</span>
      <input class="field-input" data-input="${f}" value="${esc(sel[f])}" ${attrs}>${help ? `<span class="field-help">${help}</span>` : ''}</label>`;

  /* ---------- Pricing helpers ---------- */
  const deckArea = () => {
    const d = api.design();
    return ['front', 'rear', 'left', 'right'].reduce((a, s) => {
      const v = sel['deck_' + s]; if (v === 'none') return a;
      const len = s === 'front' || s === 'rear' ? d.wmm / 1000 : d.dmm / 1000;
      return a + (v === 'full' ? len : Math.min(DOOR_DECK_W, len)) * DECK_DEPTH;
    }, 0);
  };
  const flooringBy = v => FLOORING.find(x => x.v === v);
  const floorPrice = it => it.perM2 ? it.perM2 * geo().area * VAT : 0;
  const finishPrice = v => ({ standard: 0, plastered: 26, acoustic: 48 }[v]) * (geo().walls + geo().ceil) * VAT;
  const slattedArea = () => sel.slattedWalls.reduce((a, w) => a + geo().wall[w], 0);
  const skirtingPrice = () => sel.skirting === 'oak' && sel.wallFinish === 'standard' ? 16 * geo().perim * VAT : 0;
  const corkArea = () => sel.cork.reduce((a, w) => a + geo().wall[w], 0);
  const doorCosts = () => {
    let freeDoor = true, freeWin = true;
    return sel.doors.map(v => {
      const d = doorBy(v);
      if (isDoor(d) && freeDoor) { freeDoor = false; return 0; }
      if (!isDoor(d) && freeWin) { freeWin = false; return 0; }
      return d.price;
    });
  };
  const zone = () => { const m = +sel.miles; return sel.miles === '' || isNaN(m) ? null : ZONES.find(z => m <= z[0]); };
  const sum = a => a.reduce((x, y) => x + y, 0);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  /* ---------- Steps → groups → sections ----------
     Section: key, title, icon | tile(), val() (current choice), cost() (adds to the total),
     tag() (price text, defaults from cost), body(), open (default open section) */
  const STEP_DEFS = {
    'Style': [
      { title: 'Your building', secs: [
        { key: 'model', title: 'Range & model', open: true,
          tile: () => `<img src="${IMG_BASE}${api.design().model.img}" alt="">`,
          val: () => `${api.design().model.name} · ${RANGES.find(r => MODELS[r.key].includes(api.design().model)).name}`,
          tag: () => null,
          body: () => {
            const m = api.design().model;
            return RANGES.map(r => `<div class="clad-group">${r.name}</div><div class="model-grid">${MODELS[r.key].map(x =>
              `<button type="button" class="model-card${x === m ? ' on' : ''}" aria-pressed="${x === m}" data-act="model" data-v="${x.id}" data-fid="model:${x.id}">
                 <img src="${IMG_BASE}${x.img}" alt="" loading="lazy"><span class="opt-card-name">${x.name}</span><span class="opt-card-sub">from ${fmt(x.from)}</span>
               </button>`).join('')}</div>`).join('') +
              `<p class="opt-note">Changing the model keeps your size where it is available. <a href="index.html">Compare every style and size</a></p>`;
          } }
      ] }
    ],

    'Size': [
      { title: 'Size', secs: [
        { key: 'size', title: 'Width & depth', icon: 'ruler', open: true,
          val: () => { const d = api.design(); return `${d.wl}m × ${d.dl}m · ${geo().area.toFixed(1)} m² inside`; },
          tag: () => fmt(api.design().price),
          body: () => {
            const d = api.design();
            return sub('Width') + `<div class="size-grid" role="radiogroup" aria-label="Width">${d.g.wl.map((w, i) => {
                const ok = d.g.rows[d.r][2][i] > 0, on = i === d.c;
                return `<button type="button" role="radio" class="size-chip${on ? ' on' : ''}" aria-checked="${on}" ${ok ? '' : 'disabled'}
                  data-act="width" data-v="${i}" data-fid="w:${i}">${w}m</button>`;
              }).join('')}</div>` +
              sub('Depth') + `<div class="seg" role="radiogroup" aria-label="Depth">${d.g.rows.map((rw, i) => {
                const on = i === d.r, ok = rw[2][d.c] > 0;
                return `<button type="button" role="radio" class="${on ? 'on' : ''}" aria-checked="${on}" ${ok ? '' : 'disabled'} data-act="depth" data-v="${i}" data-fid="d:${i}">${rw[0]}m</button>`;
              }).join('')}</div>` +
              note('Sizes go up in 610mm steps. The price shown is the building at this size.');
          } },
        { key: 'height', title: 'Building height', icon: 'height',
          val: () => ({ standard: 'Standard', extended: 'Extended (+200mm)', max: 'Max (+500mm)' })[sel.height],
          cost: () => ({ standard: 0, extended: 936, max: 2340 })[sel.height],
          body: () => list('height', [
            { v: 'standard', name: 'Standard', sub: 'Internal 2235mm at the front', price: 0 },
            { v: 'extended', name: 'Extended height (+200mm)', sub: 'Internal 2435mm at the front', price: 936 },
            { v: 'max', name: 'Max height (+500mm)', sub: 'Internal 2735mm at the front', price: 2340 }
          ], 'Building height') + note('Raises the walls and roof together. Doors and windows keep their real sizes.') },
        { key: 'frame', title: 'Frame colour', tile: () => '<span class="tile-fill" style="--c:#3b3d3f"></span>',
          val: () => 'Graphite · doors, windows and trims', cost: () => 0,
          body: () => list('frame', [{ v: 'graphite', name: 'Graphite', sub: 'Doors, windows and trims', color: '#3b3d3f', price: 0 }], 'Frame colour') +
            note('Graphite is the only frame colour for this model.') }
      ] },
      { title: 'Foundations', note: 'Site conditions are confirmed at survey', secs: [
        { key: 'foundSys', title: 'Foundation system', icon: 'piles',
          val: () => ({ pile: 'Piles', screw: 'Ground screws', both: 'Piles and screws', customer: 'Customer supplied' })[sel.foundSys],
          cost: () => ({ pile: 0, screw: 540, both: 1104, customer: 0 })[sel.foundSys],
          body: () => list('foundSys', [
            { v: 'pile', name: 'Piles', price: 0 },
            { v: 'screw', name: 'Ground screws', price: 540 },
            { v: 'both', name: 'Piles and screws', price: 1104 },
            { v: 'customer', name: 'Customer supplied', sub: 'You provide a suitable base', price: 0 }
          ], 'Foundation system') },
        { key: 'foundPack', title: 'Foundation pack', icon: 'pack',
          val: () => ({ none: 'None', standard: 'Standard', piles: 'Additional piles (full)' })[sel.foundPack],
          cost: () => ({ none: 0, standard: 1680, piles: 1680 })[sel.foundPack],
          body: () => list('foundPack', [
            { v: 'none', name: 'None', price: 0 },
            { v: 'standard', name: 'Standard', price: 1680 },
            { v: 'piles', name: 'Additional piles (full)', price: 1680 }
          ], 'Foundation pack') }
      ] },
      { title: 'Details', secs: [
        { key: 'dims', title: 'Dimensions', icon: 'dims', tag: () => null,
          val: () => `Inside ${Math.round(geo().W * 1000)} × ${Math.round(geo().D * 1000)}mm, ${Math.round(geo().hF * 1000)}mm high`,
          body: () => {
            const g = geo(), d = api.design(), mm = n => Math.round(n * 1000) + 'mm';
            return kv([
              ['Displayed size', `${d.wl}m × ${d.dl}m`],
              ['Internal (clear, after finishes)', `${mm(g.W)} × ${mm(g.D)}`],
              ['Internal height (front / rear)', `${mm(g.hF)} / ${mm(g.hR)}`],
              ['Internal floor area', `${g.area.toFixed(2)} m²`],
              ['Wall thickness', '80mm'],
              ['Walls, outer faces', `${mm(g.W + 0.16)} × ${mm(g.D + 0.16)}`],
              ['External height incl. roof', mm(2.5 + HEIGHT_UP[sel.height] / 1000)],
              ['Door and window slot module', '305mm']
            ]);
          } }
      ] }
    ],

    'Doors & windows': [
      { title: 'Doors & windows', secs: [
        { key: 'catalogue', title: 'Add a door or window', icon: 'door', open: true, tag: () => null,
          val: () => `${DOORS.length} doors and windows`,
          body: () => {
            const show = DOORS.filter(d => sel.dwFilter === 'all' || (sel.dwFilter === 'doors' ? isDoor(d) : sel.dwFilter === 'windows' ? !isDoor(d) : d.h >= 2070));
            return seg('dwFilter', [['all', 'All'], ['doors', 'Doors'], ['windows', 'Windows'], ['tall', 'Full height']], 'Show') +
              `<div class="dw-list">${show.map(d => {
                const n = sel.doors.filter(x => x === d.v).length;
                return `<div class="dw-row">
                  <span class="dw-glyph">${dwGlyph(d)}</span>
                  <span class="sw-text"><span class="sw-name">${d.name}${n ? ` <span class="chip-count">${n}</span>` : ''}</span>
                    <span class="sw-sub">${d.sub ? d.sub + ' · ' : ''}${d.w} × ${d.h}mm · ${d.slots} slots</span></span>
                  <span class="dw-price">${fmt(d.price)}</span>
                  <button type="button" class="add-btn" data-act="push" data-f="doors" data-v="${d.v}" data-fid="dw:${d.v}" aria-label="Add ${d.name}">Add</button>
                </div>`;
              }).join('')}</div>` +
              note('One door and one window are included in the base price. After adding, tap a green slot on the plan, elevation or 3D wall to place it.');
          } },
        { key: 'placed', title: 'Your doors & windows', icon: 'list',
          val: () => {
            const used = sum(sel.doors.map(v => doorBy(v).slots)), slots = Math.floor(api.design().wmm / 305);
            return sel.doors.length ? `${plural(sel.doors.length, 'item')} · front wall ${used} of ${slots} slots` : 'Nothing added yet';
          },
          cost: () => sum(doorCosts()),
          tag: () => sel.doors.length ? (sum(doorCosts()) ? '+' + fmt(sum(doorCosts())) : 'Included') : 'None',
          body: () => {
            if (!sel.doors.length) return lead('Nothing added yet. Add a door or window above, then place it on the plan.');
            const costs = doorCosts();
            return `<div class="dw-list">${sel.doors.map((v, i) => { const d = doorBy(v); return `<div class="dw-row">
                <span class="dw-glyph">${dwGlyph(d)}</span>
                <span class="sw-text"><span class="sw-name">${d.name}</span><span class="sw-sub">Front wall · ${d.w} × ${d.h}mm</span></span>
                <span class="dw-price${costs[i] ? '' : ' is-zero'}">${costs[i] ? fmt(costs[i]) : 'Included'}</span>
                <button type="button" class="icon-x" data-act="remove" data-f="doors" data-v="${i}" data-fid="rm:${i}" aria-label="Remove ${d.name}">${svg('<path d="m5.5 5.5 9 9M14.5 5.5l-9 9"/>')}</button>
              </div>`; }).join('')}</div>` + note('To move one, drag it in the 3D view or select it and press Move.');
          } }
      ] }
    ],

    'Exterior': [
      { title: 'Your building', secs: [
        { key: 'cladding', title: 'Cladding', open: true,
          tile: () => { const c = CLADDING.find(x => x.v === sel.cladding); return c.img ? `<img src="img/cladding/${c.img}" alt="">` : `<span class="swatch ${c.art}"></span>`; },
          val: () => CLADDING.find(x => x.v === sel.cladding).name,
          cost: () => CLADDING.find(x => x.v === sel.cladding).price,
          body: () => list('cladding', CLADDING, 'Cladding, all walls') + note('All walls. Indicative prices inc. VAT, compared with the standard Redwood.') },
        { key: 'paint', title: 'Paint pack',
          tile: () => `<span class="tile-fill" style="--c:${PAINT.find(p => p.v === sel.paint).color}"></span>`,
          val: () => sel.paint === 'primed' ? 'Primed, ready to paint' : PAINT.find(p => p.v === sel.paint).name,
          cost: () => PAINT.find(p => p.v === sel.paint).price,
          body: () => list('paint', PAINT, 'Paint pack') + note('Primed buildings must be painted within 6 months of installation. Paint packs are supplied for you to apply.') },
        { key: 'decking', title: 'Decking',
          tile: () => {
            const edge = { front: 'M3 15.5h14', rear: 'M3 4.5h14', left: 'M4.5 3v14', right: 'M15.5 3v14' };
            return `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="8" height="8" rx=".5" class="deck-room"/>${
              Object.keys(edge).map(s => sel['deck_' + s] === 'none' ? '' : `<path d="${edge[s]}" class="deck-edge${sel['deck_' + s] === 'doors' ? ' part' : ''}"/>`).join('')}</svg>`;
          },
          val: () => {
            const on = Object.keys(SIDES).filter(s => sel['deck_' + s] !== 'none');
            return on.length ? `${on.map(s => SIDES[s] + (sel['deck_' + s] === 'doors' ? ' (by doors)' : '')).join(', ')} · ${deckArea().toFixed(1)} m²` : 'No decking';
          },
          cost: () => deckArea() * DECK_RATE[sel.deckMat],
          tag: () => deckArea() ? '+' + fmt(deckArea() * DECK_RATE[sel.deckMat]) : 'None',
          body: () => {
            const o = [['none', 'None'], ['doors', 'By doors'], ['full', 'Full width']];
            return rows(...Object.entries(SIDES).map(([s, l]) => row(l, seg('deck_' + s, o, l + ' decking'))),
                row('Material', seg('deckMat', [['redwood', 'Redwood'], ['cedar', 'Cedar'], ['composite', 'Composite']], 'Decking material'))) +
              note(deckArea() ? `${deckArea().toFixed(1)} m² of decking, 0.9m deep. Sample price ${fmt(deckArea() * DECK_RATE[sel.deckMat])}.`
                : 'Decks sit just below the door threshold with a skirt down to the ground.');
          } },
        { key: 'roof', title: 'Guttering', icon: 'gutter', val: () => `Downpipe ${sel.downpipe}`, cost: () => 0,
          body: () => rows(row('Downpipe', seg('downpipe', [['left', 'Left'], ['centre', 'Centre'], ['right', 'Right']], 'uPVC downpipe position'))) +
            note('uPVC guttering and downpipe, seen from the front. Every position is the same price.') },
        { key: 'cheeks', title: 'Side cheeks & screens', icon: 'cheeks', cost: () => 0,
          val: () => sel.cheekL === sel.cheekR ? `${FINISH[sel.cheekL]} both sides` : `Left ${FINISH[sel.cheekL].toLowerCase()}, right ${FINISH[sel.cheekR].toLowerCase()}`,
          body: () => {
            const o = [['none', 'None'], ['black', 'Black'], ['grey-slatted', 'Grey slatted']];
            return rows(row('Left', seg('cheekL', o, 'Left cheek')), row('Right', seg('cheekR', o, 'Right cheek'))) + note('Every finish is the same price.');
          } },
        { key: 'handles', title: 'Handles', tile: () => '<span class="tile-fill" style="--c:#2a2b29"></span>', val: () => 'Black', cost: () => 0,
          body: () => rows(row('Colour', seg('handles', [['black', 'Black']], 'Handle colour'))) + note('Black is the only handle colour for this model.') }
      ] },
      { title: 'Garden & surroundings', note: 'For planning, not priced', secs: [
        { key: 'setting', title: 'Setting', tile: () => `<span class="tile-fill art-${api.getSetting().replace(' ', '-').toLowerCase()}"></span>`,
          val: () => api.getSetting() + (sel.surroundings ? '' : ' · surroundings hidden'),
          body: () => `<div class="card-grid card-grid-3">${SETTINGS.map(s => { const on = api.getSetting() === s.v; return `<button type="button" class="opt-card${on ? ' on' : ''}" aria-pressed="${on}" data-act="setting" data-v="${s.v}" data-fid="setting:${s.v}">
              <span class="opt-card-art art-${s.v.replace(' ', '-').toLowerCase()}"></span><span class="opt-card-name">${s.v}</span><span class="opt-card-sub">${s.sub}</span></button>`; }).join('')}</div>` +
            toggle('surroundings', 'Show surroundings', 'Hide them to see the building on its own.') },
        { key: 'scenes', title: 'Example scenes', icon: 'picture', val: () => sel.scene || 'None',
          body: () => cards('scene', SCENES) + check('keepAdded', 'Keep what I have already added') },
        { key: 'garden', title: 'Add to the garden', icon: 'tree',
          val: () => { const n = sum(Object.values(sel.garden)); return n ? plural(n, 'item') + ' added' : 'Nothing added yet'; },
          body: () => addChips('garden', GARDEN) + note('Drag items on the plan or 3D view to place them. R rotates, Delete removes.') },
        { key: 'photo', title: 'Photo of your site', icon: 'camera', val: () => sel.photo || 'No photo',
          body: () => lead('Use a photo of where the building will go as the backdrop, or an aerial photo laid flat under it.') +
            `<div class="photo-row"><button type="button" class="pill-btn" data-act="photo" data-fid="photo">Choose a photo…</button>${seg('photoAs', [['backdrop', 'Backdrop'], ['ground', 'Ground']], 'Use the photo as')}</div>` +
            note('The photo stays on this device and is not included in share links.') }
      ] }
    ],

    'Interior': [
      { title: 'Floors & walls', secs: [
        { key: 'flooring', title: 'Flooring', open: true,
          tile: () => `<span class="tile-fill" style="--c:${flooringBy(sel.flooring).color}"></span>`,
          val: () => flooringBy(sel.flooring).name + (flooringBy(sel.flooring).perM2 ? ` · ${({ walnut: 'Walnut', oak: 'Oak', ash: 'Ash' })[sel.floorColour]}` : ''),
          cost: () => floorPrice(flooringBy(sel.flooring)),
          body: () => list('flooring', FLOORING, 'Flooring', floorPrice) +
            (flooringBy(sel.flooring).perM2 ? rows(row('Colour', seg('floorColour', [['walnut', 'Walnut'], ['oak', 'Oak'], ['ash', 'Ash']], 'Engineered flooring colour'))) : '') +
            note(`Priced for ${geo().area.toFixed(1)} m² of floor.`) },
        { key: 'insulation', title: 'Insulation', icon: 'layers', cost: () => 0,
          val: () => ({ polystyrene: 'Polystyrene', rockwool: 'Rockwool' })[sel.insulation],
          body: () => rows(row('Type', seg('insulation', [['polystyrene', 'Polystyrene'], ['rockwool', 'Rockwool']], 'Insulation'))) + note('Both are included. Rockwool is best for year-round use.') },
        { key: 'walls', title: 'Walls & skirting', icon: 'wall',
          val: () => `${({ standard: 'Standard finish', plastered: 'Plastered', acoustic: 'Acoustic pack' })[sel.wallFinish]} · ${sel.skirting === 'white' ? 'white' : 'oak'} skirting`,
          cost: () => finishPrice(sel.wallFinish) + skirtingPrice(),
          body: () => sub('Wall finish') + list('wallFinish', [
              { v: 'standard', name: 'Standard finish', color: '#f1efe9' },
              { v: 'plastered', name: 'Plastered finish', sub: 'Walls and ceiling', color: '#f6f3ee' },
              { v: 'acoustic', name: 'Acoustic pack', sub: 'Walls and ceiling, with sound insulation', color: '#d9d4cb' }
            ], 'Wall finish', it => finishPrice(it.v)) +
            sub('Skirting') + list('skirting', [
              { v: 'white', name: 'White', color: '#fbfbf9', price: 0 },
              { v: 'oak', name: 'Oak veneered', color: '#b38b5d', sub: sel.wallFinish === 'standard' ? '' : 'Included with your wall finish', price: sel.wallFinish === 'standard' ? 16 * geo().perim * VAT : 0 }
            ], 'Skirting') },
        { key: 'feature', title: 'Feature walls', icon: 'slats',
          val: () => {
            const p = [];
            if (sel.slatted !== 'none' && sel.slattedWalls.length) p.push(`${SLATS.find(x => x.v === sel.slatted).name} slats`);
            if (sel.cork.length) p.push('cork pinboard');
            return p.length ? p.join(' · ').replace(/^./, c => c.toUpperCase()) : 'None';
          },
          cost: () => (sel.slatted === 'none' ? 0 : 120 * slattedArea() * VAT) + 85 * corkArea() * VAT,
          tag: () => { const c = (sel.slatted === 'none' ? 0 : 120 * slattedArea() * VAT) + 85 * corkArea() * VAT; return c ? '+' + fmt(c) : 'None'; },
          body: () => sub(`Slatted finish · ${fmt(120 * VAT)}/m²`) + list('slatted', SLATS.map(x => ({ ...x, tag: x.v === 'none' ? 'Included' : '' })), 'Slatted finish') +
            (sel.slatted === 'none' ? '' : sub('Slats on these walls') + multi('slattedWalls', WALLS, 'Walls with slats')) +
            sub(`Cork pinboard · ${fmt(85 * VAT)}/m²`) + multi('cork', WALLS, 'Cork walls') }
      ] },
      { title: 'Fittings', secs: [
        { key: 'idoors', title: 'Interior doors', icon: 'idoor',
          val: () => sel.doorSet === 'none' || !sel.doorQty ? 'None' : `${sel.doorQty} × ${({ oak: 'oak veneered', pine: 'pine', white: 'white' })[sel.doorSet]}`,
          cost: () => sel.doorSet === 'none' ? 0 : sel.doorQty * 468,
          tag: () => sel.doorSet === 'none' || !sel.doorQty ? 'None' : '+' + fmt(sel.doorQty * 468),
          body: () => rows(row('Door set', seg('doorSet', [['none', 'None'], ['oak', 'Oak'], ['pine', 'Pine'], ['white', 'White']], 'Interior door set')),
              row('How many', stepper('doorQty', { max: 3, label: 'Interior doors' }))) + note(`${fmt(468)} each, fitted in a partition wall.`) },
        { key: 'partitions', title: 'Partition walls', icon: 'partition',
          val: () => +sel.partitionM ? `${sel.partitionM}m · ${+sel.partitionM ? 2 : 1} rooms` : 'None · 1 room',
          cost: () => +sel.partitionM * 222, tag: () => +sel.partitionM ? '+' + fmt(+sel.partitionM * 222) : 'None',
          body: () => rows(row('Length', stepper('partitionM', { max: 10, step: 0.5, unit: 'm', label: 'Partition length' }))) +
            `<button type="button" class="pill-btn pill-wide" data-act="toast" data-v="Tap a start point, then an end point on the plan. Walls snap to 50mm.">Draw a partition on the plan</button>` +
            note(`${fmt(222)} per metre. Walls snap to 50mm and to the building walls.`) },
        { key: 'kitchen', title: 'Kitchen unit', icon: 'kitchen',
          val: () => sel.kitchen === 'no' ? 'None' : `${sel.kitchen}mm, sink on the ${sel.kitchenSide}`,
          cost: () => ({ no: 0, 1000: 2880, 1200: 4320, 1500: 5280 })[sel.kitchen],
          tag: () => sel.kitchen === 'no' ? 'None' : '+' + fmt(({ 1000: 2880, 1200: 4320, 1500: 5280 })[sel.kitchen]),
          body: () => rows(row('Width', seg('kitchen', [['no', 'None'], ['1000', '1000'], ['1200', '1200'], ['1500', '1500mm']], 'Kitchen unit width'))) +
            (sel.kitchen === 'no' ? '' : rows(row('Sink side', seg('kitchenSide', [['left', 'Left'], ['right', 'Right']], 'Kitchen orientation')))) },
        { key: 'extras', title: 'Shelves & winter pack', icon: 'shelf',
          val: () => [sel.shelves === '0' ? '' : `${sel.shelves} shelves`, sel.winter === 'none' ? '' : 'winter pack'].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase()) || 'None',
          cost: () => +sel.shelves * 108, tag: () => sel.shelves === '0' ? (sel.winter === 'none' ? 'None' : 'Included') : '+' + fmt(+sel.shelves * 108),
          body: () => rows(row('Shelves', seg('shelves', [['0', 'None'], ['2', `2 +${fmt(216)}`], ['4', `4 +${fmt(432)}`]], 'Internal shelves')),
            row('Winter pack', seg('winter', [['none', 'None'], ['winter', 'Add']], 'Winter pack'))) },
        { key: 'blinds', title: 'Blinds', icon: 'blind', cost: () => 0,
          tag: () => ['blindsDW', 'blindsSliding', 'blindsFrench'].some(f => sel[f] !== 'none') ? 'Included' : 'None',
          val: () => { const n = ['blindsDW', 'blindsSliding', 'blindsFrench'].filter(f => sel[f] !== 'none').length; return n ? plural(n, 'blind type') : 'None'; },
          body: () => {
            const pf = [['none', 'None'], ['pf-white', 'Perfect fit, white'], ['pf-light-grey', 'Perfect fit, light grey'], ['pf-graphite', 'Perfect fit, graphite'], ['pf-black', 'Perfect fit, black']];
            const roller = ['black', 'white', 'light grey'].flatMap(c => [[`m-${c}`, `Roller, ${c}, motorised`], [`h-${c}`, `Roller, ${c}, manual`]]);
            const select = (f, opts, label) => `<select class="field-input" data-input="${f}" aria-label="${label}">${opts.map(([v, l]) => `<option value="${v}" ${sel[f] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
            return rows(row('Doors & windows', select('blindsDW', pf, 'Door and window blinds')),
              row('Sliding doors', select('blindsSliding', [['none', 'None'], ...roller], 'Sliding door blinds')),
              row('French doors', select('blindsFrench', [...pf.slice(0, 4), ...roller], 'French door blinds')));
          } }
      ] },
      { title: 'Furniture', note: 'For planning, not priced', secs: [
        { key: 'layouts', title: 'Suggested layouts', icon: 'sofa', val: () => sel.layout || 'None',
          body: () => lead('Furnish the room in one go. Pieces are fitted around the doors, windows and partitions.') + cards('layout', LAYOUTS) + check('keepFurniture', 'Keep the furniture already in the room') },
        { key: 'furniture', title: 'Add furniture', icon: 'sparkle',
          val: () => { const n = sum(Object.values(sel.furniture)); return n ? plural(n, 'piece') + ' added' : 'Nothing added yet'; },
          body: () => addChips('furniture', FURNITURE) + note('Drag pieces on the plan or 3D view and set their size. Right-click a seat and choose Sit here.') }
      ] }
    ],

    'Electrics': [
      { title: 'Lighting & heating', secs: [
        { key: 'lights', title: 'Internal lighting', icon: 'bulb', open: true,
          val: () => { const n = sel.q_panel + sel.q_circle + sel.q_bar; return n ? plural(n, 'light') : 'None'; },
          cost: () => (sel.q_panel + sel.q_circle + sel.q_bar) * 141.6,
          tag: () => (sel.q_panel + sel.q_circle + sel.q_bar) ? '+' + fmt((sel.q_panel + sel.q_circle + sel.q_bar) * 141.6) : 'None',
          body: () => qtyRow('q_panel', '600 × 600 panel light', 'Ceiling mounted LED', 141.6) + qtyRow('q_circle', 'Circular light', '418mm LED', 141.6) + qtyRow('q_bar', 'Bar light', 'Ceiling mounted LED', 141.6) + autoNote() },
        { key: 'heating', title: 'Heating', icon: 'heat',
          val: () => { const n = sel.q_oil + sel.q_heater15 + sel.q_heater2; return n ? plural(n, 'heater') : 'None'; },
          cost: () => sel.q_oil * 180 + (sel.q_heater15 + sel.q_heater2) * 288,
          tag: () => (sel.q_oil + sel.q_heater15 + sel.q_heater2) ? '+' + fmt(sel.q_oil * 180 + (sel.q_heater15 + sel.q_heater2) * 288) : 'None',
          body: () => qtyRow('q_oil', 'Oil filled radiator', 'Portable, thermostatic', 180, 6) + qtyRow('q_heater15', '1.5kW wall heater', 'With single socket', 288) + qtyRow('q_heater2', '2kW convector heater', 'With single socket', 288) },
        { key: 'aircon', title: 'Air conditioning', icon: 'snowflake',
          val: () => sel.q_aircon ? `${plural(sel.q_aircon, 'unit')} · ${sel.acInstall} install` : 'None',
          cost: () => sel.q_aircon * 1980 + (sel.q_aircon && sel.acInstall === 'premium' ? 744 : 0),
          tag: () => sel.q_aircon ? '+' + fmt(sel.q_aircon * 1980 + (sel.acInstall === 'premium' ? 744 : 0)) : 'None',
          body: () => qtyRow('q_aircon', 'Designer air conditioning', '', 1980, 3) +
            (sel.q_aircon ? rows(row('Install', seg('acInstall', [['standard', 'Standard'], ['premium', `Premium +${fmt(744)}`]], 'A/C installation'))) + note('Premium hides the pipework in trunking. Place the outside condenser in Switches & units.') : '') }
      ] },
      { title: 'Power & data', secs: [
        { key: 'elecPack', title: 'Electrics pack & fuse box', icon: 'plug',
          val: () => `${sel.elecPack === 'yes' ? 'Electrics pack' : 'No pack'} · ${sel.consumer} way consumer unit`,
          cost: () => (sel.elecPack === 'yes' ? 180 : 0) + ({ 2: 0, 4: 180, 6: 360 })[sel.consumer],
          body: () => rows(row('Electrics pack', seg('elecPack', [['none', 'None'], ['yes', `Yes +${fmt(180)}`]], 'Electrics pack')),
              row('Fuse box', seg('consumer', [['2', '2 way'], ['4', '4 way'], ['6', '6 way']], 'Consumer unit'))) +
            note('A 2 way consumer unit suits most buildings. High-powered equipment may need more circuits.') },
        { key: 'sockets', title: 'Sockets', icon: 'socket',
          val: () => { const n = sel.q_socket + sel.q_outSingle + sel.q_outDouble + sel.q_ethernet; return n ? plural(n, 'socket') : 'None'; },
          cost: () => (sel.q_socket + sel.q_outSingle) * 74.4 + sel.q_outDouble * 89.28 + sel.q_ethernet * 93.6,
          tag: () => { const c = (sel.q_socket + sel.q_outSingle) * 74.4 + sel.q_outDouble * 89.28 + sel.q_ethernet * 93.6; return c ? '+' + fmt(c) : 'None'; },
          body: () => qtyRow('q_socket', 'Double socket', 'Cavity wired, 13 amp', 74.4) + qtyRow('q_outSingle', 'Outside single socket', '', 74.4) +
            qtyRow('q_outDouble', 'Outside double socket', '', 89.28) + qtyRow('q_ethernet', 'Ethernet socket', 'Cat6', 93.6) + autoNote() },
        { key: 'comms', title: 'Internet & data', icon: 'wifi',
          val: () => [sel.wifi === 'yes' ? 'WiFi access point' : '', sel.cat6 === 'confirm' ? 'Cat6 to confirm' : ''].filter(Boolean).join(' · ') || 'None',
          cost: () => sel.wifi === 'yes' ? 180 : 0,
          tag: () => sel.wifi === 'yes' ? '+' + fmt(180) : sel.cat6 === 'none' ? 'None' : 'To confirm',
          body: () => rows(row('WiFi point', seg('wifi', [['none', 'None'], ['yes', `Yes +${fmt(180)}`]], 'WiFi access point')),
              row('Cat6 cable', seg('cat6', [['none', 'None'], ['confirm', 'At consultation']], 'Armoured cat6 ethernet connection'))) +
            note('The WiFi access point uses HomePlug to bring your home network through the mains supply.') }
      ] },
      { title: 'Outside', secs: [
        { key: 'extLights', title: 'External lights', icon: 'sun',
          val: () => sel.q_extLight ? `${plural(sel.q_extLight, 'solar light')}` : 'None',
          cost: () => sel.q_extLight * 115.2, tag: () => sel.q_extLight ? '+' + fmt(sel.q_extLight * 115.2) : 'None',
          body: () => rows(row('Style', seg('extStyle', [['solar', 'Solar']], 'External light style'))) + qtyRow('q_extLight', 'External lights', 'Solar', 115.2, 8) },
        { key: 'extConn', title: 'Mains connection', icon: 'cable', cost: () => 0, tag: () => sel.extConn === 'none' ? 'None' : 'To confirm',
          val: () => sel.extConn === 'none' ? 'None' : 'Confirm at design consultation',
          body: () => rows(row('Supply', seg('extConn', [['none', 'None'], ['confirm', 'At consultation']], 'External electrical connection'))) +
            note('The supply cable from your house is confirmed at the design consultation.') }
      ] },
      { title: 'On the plan', note: 'No extra charge', secs: [
        { key: 'fixtures', title: 'Switches & units', icon: 'switch', tag: () => null,
          val: () => `${plural(sel.q_switch1 + sel.q_switch2, 'switch')} · ${sel.q_cu ? 'fuse box placed' : 'fuse box not placed'}`.replace('switchs', 'switches'),
          body: () => lead('Show where you would like them. They go on the electrical plan and the 3D view.') +
            qtyRow('q_switch1', 'Light switch, 1 gang', '') + qtyRow('q_switch2', 'Light switch, 2 gang', '') +
            qtyRow('q_cu', 'Consumer unit', 'Not on the front wall', 0, 1) + qtyRow('q_condenser', 'Air conditioning condenser', 'Outside, side or rear', 0, 3) +
            toggle('autoPlace', 'Place new items automatically', 'Otherwise they are added for you to position.') }
      ] }
    ],

    'Delivery': [
      { title: 'Delivery & install', secs: [
        { key: 'location', title: 'Delivery location', icon: 'pinmap', open: true,
          val: () => zone() ? `${sel.postcode ? sel.postcode.toUpperCase() + ' · ' : ''}${sel.miles} miles · ${zone()[1]}` : (sel.postcode ? sel.postcode.toUpperCase() + ' · distance needed' : 'Not set yet'),
          cost: () => zone() ? zone()[2] : 0,
          tag: () => zone() ? (zone()[2] ? '+' + fmt(zone()[2]) : 'Included') : 'To price',
          body: () => field('postcode', 'Postcode', 'Where the building is going.', 'autocomplete="postal-code" placeholder="e.g. HP19 8AA"') +
            field('miles', 'Distance from our depot (miles)', 'Sample only: enter a distance until real routing is connected.', 'inputmode="numeric" placeholder="e.g. 35"') +
            kv(ZONES.map(([m, l, p], i) => [`${l} (${i ? `${ZONES[i - 1][0] + 1}–` : 'up to '}${m === Infinity ? '200+' : m} miles)`, p ? fmt(p) : 'Included'])) },
        { key: 'access', title: 'Site access', icon: 'crane',
          val: () => ({ standard: 'Standard access', restricted: 'Restricted access', crane: 'Crane or specialist lift' })[sel.access],
          cost: () => ({ standard: 0, restricted: 540, crane: 2160 })[sel.access],
          body: () => list('access', [
            { v: 'standard', name: 'Standard access', price: 0 },
            { v: 'restricted', name: 'Restricted access', sub: 'Narrow or long carry', price: 540 },
            { v: 'crane', name: 'Crane or specialist lift', price: 2160 }
          ], 'Site access') },
        { key: 'included', title: 'What’s included', icon: 'info', tag: () => null,
          val: () => 'Delivery within 50 miles and installation',
          body: () => kv([
            ['Included', 'Delivery within 50 miles (zone 1) and standard installation on prepared foundations.'],
            ['Chargeable', 'Longer distances, restricted access and crane lifts, as chosen above.'],
            ['Confirmed at survey', 'Ground conditions, service routes, planning and building regulations advice, removing obstacles.']
          ]) }
      ] }
    ],

    'Summary': [
      { title: 'Your design', secs: [
        { key: 'breakdown', title: 'Price breakdown', icon: 'tag', open: true,
          val: () => `${fmt(api.total())} inc. VAT`, tag: () => null,
          body: () => {
            const lines = allSections().filter(s => s.cost && s.cost() > 0.5).map(s => [s.title, s.val(), s.cost()]);
            const d = api.design(), total = api.total();
            return (zone() ? '' : `<div class="callout">Delivery is not priced yet. <button type="button" class="link-inline" data-act="goto" data-v="Delivery">Add a location</button></div>`) +
              `<table class="bd"><tbody>
                <tr><th scope="row">Building<span>${d.model.name} ${d.wl}m × ${d.dl}m</span></th><td>${fmt(d.price)}</td></tr>
                ${lines.map(([t, v, c]) => `<tr><th scope="row">${t}<span>${esc(v)}</span></th><td>${fmt(c)}</td></tr>`).join('')}
              </tbody><tfoot>
                <tr><th scope="row">Total ex. VAT</th><td>${fmt(total / VAT)}</td></tr>
                <tr><th scope="row">VAT 20%</th><td>${fmt(total - total / VAT)}</td></tr>
                <tr class="bd-total"><th scope="row">Total inc. VAT</th><td>${fmt(total)}</td></tr>
              </tfoot></table>` + note('Sample prices for demonstration only.');
          } },
        { key: 'name', title: 'Design name', icon: 'name', tag: () => null, val: () => sel.designName || 'Untitled',
          body: () => field('designName', 'Name', `${api.design().model.name} · ${api.design().wl}m × ${api.design().dl}m · ${plural(sel.doors.length, 'door/window').replace('door/windows', 'doors/windows')}`) },
        { key: 'finance', title: 'Spread the cost', icon: 'pound', tag: () => null,
          val: () => `From ${fmt(api.total() * api.financeRate)}/month`,
          body: () => lead('See monthly payments for different deposits and terms. Sample illustration, not an offer.') +
            `<button type="button" class="pill-btn pill-wide" data-act="toast" data-v="The finance calculator is simulated in this prototype.">Open the finance calculator</button>` },
        { key: 'notes', title: 'Notes & special requests', icon: 'note', tag: () => null,
          val: () => sel.notes ? sel.notes.slice(0, 40) + (sel.notes.length > 40 ? '…' : '') : 'None',
          body: () => `<label class="field"><span class="field-label">Notes</span><textarea class="field-input" rows="4" data-input="notes" placeholder="Anything we should know">${esc(sel.notes)}</textarea>
            <span class="field-help">Included in the specification and stored with the design on this device.</span></label>` }
      ] },
      { title: 'Next steps', note: 'Simulated in this demo', secs: [
        { key: 'actions', title: 'Quote & order', icon: 'send', tag: () => null, val: () => 'Save, enquire, book or order',
          body: () => action('Save quote', 'note') + action('Send an enquiry', 'send') + action('Book a design consultation', 'pinmap') +
            action('Finance information', 'pound') + action('Place order / pay deposit', 'tag') },
        { key: 'docs', title: 'Documents & sharing', icon: 'share', tag: () => null, val: () => 'PDF, JSON export, share link',
          body: () => action('Specification / PDF', 'note') + action('Export design (JSON)', 'list') + action('Copy share link', 'share', 'Share link copied (simulated).') +
            note('Share links hold the design in the page address, so treat them as public.') }
      ] }
    ]
  };

  function autoNote() { return note(sel.autoPlace ? 'New items are placed on a free spot; drag them on the plan to move them.' : 'New items are added to your order for you to place on the plan.'); }

  function dwGlyph(d) {
    const p = {
      door: '<rect x="6" y="2.5" width="8" height="15" rx=".5"/><path d="M12 10.5v.01"/>',
      slide: '<rect x="2.5" y="3" width="15" height="14.5" rx=".5"/><path d="M10 3v14.5M6 9.5l-1.5 1.5L6 12.5M14 9.5l1.5 1.5-1.5 1.5"/>',
      french: '<rect x="3.5" y="3" width="13" height="14.5" rx=".5"/><path d="M10 3v14.5M8.5 10.5v1M11.5 10.5v1"/>',
      window: '<rect x="3" y="6" width="14" height="7" rx=".5"/><path d="M3 9.5h14"/>',
      tall: '<rect x="6.5" y="2.5" width="7" height="15" rx=".5"/>'
    };
    return svg(p[d.kind]);
  }

  /* ---------- Rendering ---------- */
  const SECS = {};
  Object.entries(STEP_DEFS).forEach(([step, groups]) => groups.forEach(g => g.secs.forEach(s => { s.step = step; SECS[s.key] = s; })));
  const allSections = () => Object.values(SECS);
  const openSec = {};
  Object.entries(STEP_DEFS).forEach(([step, groups]) => { openSec[step] = (groups.flatMap(g => g.secs).find(s => s.open) || {}).key; });

  const tagOf = s => s.tag ? s.tag() : s.cost ? (Math.round(s.cost()) ? '+' + fmt(s.cost()) : 'Included') : null;
  const tileOf = s => s.tile ? s.tile() : svg(ICON[s.icon]);

  function secHTML(s, open, name) {
    const tag = tagOf(s);
    return `<details class="acc" ${name ? `name="${name}"` : ''} data-sec="${s.key}" ${open ? 'open' : ''}>
      <summary class="acc-sum">
        <span class="acc-tile${s.tile ? '' : ' acc-tile-icon'}">${tileOf(s)}</span>
        <span class="acc-text"><span class="acc-title">${s.title}</span><span class="acc-val">${esc(s.val())}</span></span>
        ${tag != null ? `<span class="acc-price">${tag}</span>` : ''}
        <span class="acc-chev" aria-hidden="true"></span>
      </summary>
      <div class="acc-body">${s.body()}</div>
    </details>`;
  }
  const groupHTML = (g, inner) => `<h2 class="acc-group">${g.title}${g.note ? ` <span class="acc-group-note">${g.note}</span>` : ''}</h2>${inner}`;

  function render() {
    if (query) return renderSearch();
    const groups = STEP_DEFS[current] || [];
    const name = 'acc-' + current.replace(/\W+/g, '');
    container.innerHTML = groups.map(g => groupHTML(g, g.secs.map(s => secHTML(s, openSec[current] === s.key, name)).join(''))).join('');
    paintSummaries();
  }

  // Search finds options across every step; matching sections open under their step's name
  const textOf = s => (s.title + ' ' + s.val() + ' ' + s.body().replace(/<[^>]+>/g, ' ')).toLowerCase();
  function renderSearch() {
    const q = query.toLowerCase();
    const html = Object.entries(STEP_DEFS).map(([step, groups]) => {
      const hits = groups.flatMap(g => g.secs).filter(s => textOf(s).includes(q));
      if (!hits.length) return '';
      return `<h2 class="acc-group acc-step">${step}${step === current ? ' <span class="acc-group-note">This step</span>' : ` <button type="button" class="link-inline" data-act="goto" data-v="${step}">Go to step</button>`}</h2>` +
        hits.map(s => secHTML(s, true)).join('');
    }).join('');
    container.innerHTML = html || `<p class="ext-empty">No options match “${esc(query)}”.</p>`;
    paintSummaries();
  }

  function paintSummaries() {
    container.querySelectorAll('.acc').forEach(d => {
      const s = SECS[d.dataset.sec], tag = tagOf(s);
      d.querySelector('.acc-val').textContent = s.val();
      d.querySelector('.acc-tile').innerHTML = tileOf(s);
      const p = d.querySelector('.acc-price');
      if (p) { p.textContent = tag; p.classList.toggle('is-included', /^(Included|None|£0|To price|To confirm)$/.test(tag)); }
    });
  }

  // After a change: redraw every open body and all summaries, keeping focus on the same control
  function refresh() {
    const fid = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.fid;
    container.querySelectorAll('.acc').forEach(d => {
      const b = d.querySelector('.acc-body');
      if (b.contains(document.activeElement) && document.activeElement.matches('input:not([type=checkbox]), textarea, select')) return;
      b.innerHTML = SECS[d.dataset.sec].body();
    });
    paintSummaries();
    if (fid) { const el = container.querySelector(`[data-fid="${CSS.escape(fid)}"]`); if (el) el.focus({ preventScroll: true }); }
  }
  const changed = () => { refresh(); api.onChange(); };

  /* ---------- Events ---------- */
  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t || !container.contains(t)) return;
    const { act, f, v } = t.dataset;
    switch (act) {
      case 'set': sel[f] = typeof sel[f] === 'number' ? +v : v; break;
      case 'inc': sel[f] = Math.min(+t.dataset.max, Math.max(+t.dataset.min, Math.round((+sel[f] + +t.dataset.d) * 10) / 10)); break;
      case 'toggle': { const i = sel[f].indexOf(v); i < 0 ? sel[f].push(v) : sel[f].splice(i, 1); break; }
      case 'add': sel[f][v] = (sel[f][v] || 0) + 1; break;
      case 'push': {
        // doors and windows reserve 305mm slots: don't overfill the front wall
        const free = Math.floor(api.design().wmm / 305) - sum(sel.doors.map(x => doorBy(x).slots));
        if (f === 'doors' && doorBy(v).slots > free) { toast(`Not enough room: ${doorBy(v).name} needs ${doorBy(v).slots} slots and ${free} are free on the front wall.`); return; }
        sel[f].push(v); break;
      }
      case 'remove': sel[f].splice(+v, 1); break;
      case 'width': api.setSize(null, +v); break;
      case 'depth': api.setSize(+v, null); break;
      case 'model': location.href = `configurator.html?model=${v}&r=${api.design().r}&c=${api.design().c}`; return;
      case 'setting': api.setSetting(v); break;
      case 'photo': sel.photo = 'Site photo as ' + sel.photoAs; break;
      case 'goto': api.goToStep(v); return;
      case 'toast': toast(v); return;
    }
    changed();
  }
  function onInput(e) {
    const t = e.target;
    if (t.dataset.input) { sel[t.dataset.input] = t.value; paintSummaries(); api.onChange(); }
  }
  function onChangeEvt(e) {
    const t = e.target;
    if (t.dataset.check) { sel[t.dataset.check] = t.checked; changed(); }
    else if (t.tagName === 'SELECT' && t.dataset.input) { sel[t.dataset.input] = t.value; paintSummaries(); }
  }
  function onKey(e) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const group = e.target.closest('[role="radiogroup"]'); if (!group || !container.contains(group)) return;
    const btns = [...group.querySelectorAll('button[role="radio"]:not([disabled])')], i = btns.indexOf(e.target); if (i < 0) return;
    e.preventDefault();
    const next = btns[(i + (/Right|Down/.test(e.key) ? 1 : btns.length - 1)) % btns.length];
    next.focus(); next.click();
  }

  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  return {
    init(a) {
      api = a;
      container = document.getElementById('opts');
      container.addEventListener('click', onClick);
      container.addEventListener('input', onInput);
      container.addEventListener('change', onChangeEvt);
      container.addEventListener('keydown', onKey);
      // remember which section is open in each step
      container.addEventListener('toggle', e => {
        const d = e.target; if (!query && d.classList && d.classList.contains('acc') && d.open) openSec[current] = d.dataset.sec;
      }, true);
    },
    show(step) { current = step; render(); },
    open(key) { openSec[current] = key; render(); },
    extras: () => sum(allSections().map(s => s.cost ? s.cost() : 0)),
    filter(q) { query = q.trim(); render(); },
    refresh: () => { paintSummaries(); refresh(); }
  };
})();
