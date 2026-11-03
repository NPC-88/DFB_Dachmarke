// UI building blocks after the DFB Dachmarke UI Library: collapsible panel,
// Chips, Range Slider (label left, value right, thin track), icon button.
// The app logic does not depend on the markup; restyle here and in shell.html.

import { icon } from './icons.js';

// Collapsible section (native <details>; chevron turns when open).
export function panel(title, open = true) {
  const node = el('details', { class: 'panel' });
  node.open = open;
  const sum = el('summary', {}, title);
  sum.append(icon('chevron', 20));
  node.append(sum);
  const body = el('div', { class: 'panel-body' });
  node.append(body);
  return { node, body };
}

const idOf = (key) => 'ctl-' + key.replace(/\W/g, '-');

// Chips: one choice out of a few. Returns { node, set(value) }.
export function chips(label, options, onPick, { small = false } = {}) {
  const wrap = el('div', { class: 'chip-group' });
  if (label) wrap.append(el('span', { class: 'group-label' }, label));
  const row = el('div', { class: 'chips' + (small ? ' small' : ''), role: 'radiogroup', 'aria-label': label || undefined });
  const btns = options.map(([v, l]) => {
    const b = el('button', { type: 'button', class: 'chip', role: 'radio', 'data-value': v }, l);
    b.addEventListener('click', () => onPick(v));
    row.append(b);
    return b;
  });
  wrap.append(row);
  return {
    node: wrap,
    set: (v) => btns.forEach((b) => { const on = b.dataset.value === String(v); b.setAttribute('aria-checked', String(on)); b.classList.toggle('active', on); }),
  };
}

// Range Slider: label + value on top, track below. onChange(value, transient).
export function slider(c, onChange) {
  const wrap = el('div', { class: 'slider' });
  const head = el('div', { class: 'slider-head' });
  const lab = el('label', { for: idOf(c.key) }, c.label);
  const out = el('output', { for: idOf(c.key) });
  head.append(lab, out);
  const r = el('input', { type: 'range', min: c.min, max: c.max, step: c.step, id: idOf(c.key) });
  wrap.append(head, r);
  const show = (v) => {
    out.textContent = (c.step >= 1 ? Math.round(v) : (+v).toFixed(c.step < 0.01 ? 2 : 2)) + (c.unit && c.unit !== '×' ? (c.unit === '°' ? '°' : ' ' + c.unit) : '');
    r.style.setProperty('--fill', ((v - c.min) / (c.max - c.min)) * 100 + '%');
  };
  r.addEventListener('input', () => { show(r.value); onChange(parseFloat(r.value), true); });
  r.addEventListener('change', () => onChange(parseFloat(r.value), false));
  return { node: wrap, set: (v) => { r.value = v; show(v); } };
}

export function el(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) n.setAttribute(k, v);
  if (text !== undefined) n.textContent = text;
  return n;
}

// Icon button (toolkit Button, icon-only) with a tooltip.
export function iconButton(name, label, { variant = 'ghost', size = 'small' } = {}) {
  const b = el('button', { type: 'button', class: `btn btn-icon btn-${variant} btn-${size}`, 'aria-label': label, 'data-tip': label });
  b.append(icon(name, size === 'small' ? 18 : 20));
  return b;
}
