/* MicroSprouts enquiry flow — no booking or payment is taken on this page */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('interest-form');
  if (!form) return;
  const pack = $('pack'), qty = $('qty'), frequency = $('frequency'), date = $('date'), postcode = $('postcode'), code = $('code');
  const gbp = (pence) => '£' + (pence / 100).toFixed(2);
  const method = () => document.querySelector('input[name="method"]:checked')?.value || 'pickup';

  // Use the London calendar day, not the viewer's local timezone.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', day: '2-digit', month: '2-digit', year: 'numeric'
  }).formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const today = parts.year + '-' + parts.month + '-' + parts.day;
  const limit = new Date(today + 'T12:00:00Z');
  limit.setUTCDate(limit.getUTCDate() + 7);
  date.min = limit.toISOString().slice(0,10);

  function update() {
    const size = Number(pack.value), count = Math.max(1, Math.min(10, Number(qty.value) || 1));
    const base = (size === 500 ? 1699 : 999) * count;
    const delivery = method() === 'delivery' ? 230 : 0;
    const applied = code.value.trim().toUpperCase() === 'SPROUT' && frequency.value === 'once';
    const discount = applied ? Math.round(base * .2) : 0;
    $('subtotal').textContent = gbp(base);
    $('deliveryfee').textContent = delivery ? gbp(delivery) : 'FREE';
    $('discountline').hidden = !discount;
    $('discount').textContent = '−' + gbp(discount);
    $('total').textContent = gbp(base + delivery - discount);
    $('postcode-field').hidden = method() !== 'delivery';
    $('postcode').required = method() === 'delivery';
    $('datehint').textContent = method() === 'delivery'
      ? 'Personal delivery is normally Tuesday, Wednesday or Thursday, depending on availability.'
      : 'Collection may be arranged on any day, within an agreed time window.';
    $('promo-hint').textContent = frequency.value === 'once'
      ? 'Code SPROUT gives 20% off the sprouts on a one-time enquiry.'
      : 'The SPROUT discount currently applies to one-time orders only.';
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < date.min) return false;
    const requested = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(requested.getTime()) || requested.toISOString().slice(0,10) !== value) return false;
    return method() !== 'delivery' || [2,3,4].includes(requested.getUTCDay());
  }

  function validLondonPostcode(value) {
    const compact = value.toUpperCase().replace(/\s+/g,'');
    return /^(E|EC|N|NW|SE|SW|W|WC)\d{1,2}[A-Z]?(?:\d[A-Z]{2})?$/.test(compact);
  }

  form.querySelectorAll('input,select').forEach(control => {
    control.addEventListener('input', update);
    control.addEventListener('change', update);
  });

  document.querySelectorAll('[data-pack]').forEach(button => {
    button.addEventListener('click', () => {
      pack.value = button.dataset.pack;
      update();
    });
  });
  document.querySelectorAll('[data-plan]').forEach(button => {
    button.addEventListener('click', () => {
      frequency.value = button.dataset.plan;
      update();
    });
  });

  const menuButton = $('menu-toggle');
  menuButton?.addEventListener('click', () => {
    const open = document.querySelector('.page-header').classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', () => {
    document.querySelector('.page-header').classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    const count = Number(qty.value), size = Number(pack.value);
    const message = $('form-message');
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      message.textContent = 'Please choose between 1 and 10 packs.'; qty.focus(); return;
    }
    if (!validDate(date.value)) {
      message.textContent = 'Please choose an eligible date at least seven days from now. Personal deliveries are normally Tuesday to Thursday.';
      date.focus(); return;
    }
    if (method() === 'delivery' && !validLondonPostcode(postcode.value)) {
      message.textContent = 'Please enter a London postcode such as SE1 or SW15.'; postcode.focus(); return;
    }
    const base = (size === 500 ? 1699 : 999) * count;
    const delivery = method() === 'delivery' ? 230 : 0;
    const promo = code.value.trim().toUpperCase() === 'SPROUT' && frequency.value === 'once';
    const total = base + delivery - (promo ? Math.round(base * .2) : 0);
    const frequencyName = {once:'One-time',weekly:'Weekly enquiry (not automatic billing)',fortnightly:'Fortnightly enquiry (not automatic billing)'}[frequency.value] || 'One-time';
    const lines = [
      'Hello! I would like to enquire about MicroSprouts broccoli sprouts.',
      '',
      'Broccoli sprouts: ' + size + 'g × ' + count + ' pack(s)',
      'Frequency: ' + frequencyName,
      'Collection / delivery: ' + (method() === 'pickup' ? 'Free collection' : 'Personal London delivery'),
      'Preferred date: ' + date.value
    ];
    if (method() === 'delivery') lines.push('London postcode: ' + postcode.value.trim().toUpperCase());
    if (promo) lines.push('Promo code: SPROUT (20% off sprouts)');
    lines.push(
      'Indicative total: ' + gbp(total),
      '',
      'Please confirm your availability, the time window and how to pay. I understand this is an enquiry only; no order or subscription is confirmed yet.'
    );
    const link = 'https://wa.me/447386853514?text=' + encodeURIComponent(lines.join('\n'));
    const newTab = window.open(link,'_blank','noopener,noreferrer');
    message.textContent = 'Your WhatsApp enquiry is ready. Press Send in WhatsApp to contact me. No payment or booking has been made yet.';
    $('whatsapp-fallback').href = link;
    $('whatsapp-fallback').hidden = false;
    if (!newTab) {
      // Keep a clickable link available for popup-blocking browsers.
      message.textContent = 'If WhatsApp did not open, use the WhatsApp link below to send your enquiry.';
    }
  });
  update();
})();
