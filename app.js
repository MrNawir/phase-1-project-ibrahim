/* ChamaChama App Logic */

const API_BASES = ['http://localhost:3000', 'http://localhost:3001'];
let apiBase = localStorage.getItem('apiBase') || null;

// DOM Elements
const form = document.getElementById('investment-form');
const tableBody = document.getElementById('table-body');
const totalInvestedEl = document.getElementById('totalInvested');
const totalCurrentEl = document.getElementById('totalCurrent');
const netGainEl = document.getElementById('netGain');
const roiPercentEl = document.getElementById('roiPercent');
const searchInput = document.getElementById('search');
const filterCategory = document.getElementById('filterCategory');
const dateFromInput = document.getElementById('dateFrom');
const dateToInput = document.getElementById('dateTo');
const resetFiltersBtn = document.getElementById('resetFilters');
const yearEl = document.getElementById('year');

// Charts
let allocationPieChart = null;
let categoryBarChart = null;

// State
let investments = [];
let lastApiError = null;

// Utils
const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const pct = (n) => `${(n).toFixed(2)}%`;

function safeNumber(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num : 0;
}

function computeROI(inv) {
  const invested = safeNumber(inv.amountInvested);
  const current = safeNumber(inv.currentValue);
  if (invested <= 0) return 0;
  return ((current - invested) / invested) * 100;
}

function computeSummary(list) {
  const totals = list.reduce((acc, it) => {
    const invested = safeNumber(it.amountInvested);
    const current = safeNumber(it.currentValue);
    acc.invested += invested;
    acc.current += current;
    return acc;
  }, { invested: 0, current: 0 });
  const net = totals.current - totals.invested;
  const roi = totals.invested > 0 ? (net / totals.invested) * 100 : 0;
  return { ...totals, net, roi };
}

async function fetchWithFallback(path, options = {}) {
  const bases = apiBase ? [apiBase, ...API_BASES.filter(b => b !== apiBase)] : API_BASES;
  let lastErr;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, options);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      apiBase = base;
      try { localStorage.setItem('apiBase', apiBase); } catch {}
      return res;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('API request failed');
}

function setYear() {
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function applyFilters(list) {
  const q = (searchInput.value || '').trim().toLowerCase();
  const cat = filterCategory.value;
  const from = dateFromInput.value ? new Date(dateFromInput.value) : null;
  const to = dateToInput.value ? new Date(dateToInput.value) : null;

  return list.filter((it) => {
    let ok = true;
    if (q) {
      const hay = `${it.name} ${it.notes || ''}`.toLowerCase();
      ok = ok && hay.includes(q);
    }
    if (cat) ok = ok && it.category === cat;
    if (from) ok = ok && new Date(it.date) >= from;
    if (to) ok = ok && new Date(it.date) <= to;
    return ok;
  });
}

async function fetchInvestments() {
  try {
    const res = await fetchWithFallback('/investments');
    investments = await res.json();
    lastApiError = null;
  } catch (err) {
    console.error(err);
    lastApiError = err;
    // Friendly fallback message in UI; will also be shown by renderTable
    tableBody.innerHTML = `<tr><td colspan="8">Failed to load data from API (${err.message}). Is JSON Server running on port 3000 or 3001? Try: <code>npm run server</code> or <code>npm run server:3001</code>.</td></tr>`;
  }
}

async function addInvestment(data) {
  const payload = { ...data, amountInvested: safeNumber(data.amountInvested), currentValue: safeNumber(data.currentValue) };
  const res = await fetchWithFallback('/investments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const created = await res.json();
  investments.push(created);
  return created;
}

async function updateInvestment(id, patch) {
  const res = await fetchWithFallback(`/investments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  const updated = await res.json();
  const idx = investments.findIndex((i) => i.id === id);
  if (idx >= 0) investments[idx] = updated;
  return updated;
}

async function deleteInvestment(id) {
  await fetchWithFallback(`/investments/${id}`, { method: 'DELETE' });
  investments = investments.filter((i) => i.id !== id);
}

function renderSummary(list) {
  const s = computeSummary(list);
  totalInvestedEl.textContent = currency.format(s.invested);
  totalCurrentEl.textContent = currency.format(s.current);
  netGainEl.textContent = `${s.net >= 0 ? '+' : ''}${currency.format(s.net)}`;
  roiPercentEl.textContent = pct(s.roi);
  roiPercentEl.className = s.roi >= 0 ? 'mini-card-value roi-pos' : 'mini-card-value roi-neg';
}

function renderTable(list) {
  if (lastApiError) {
    tableBody.innerHTML = `<tr><td colspan="8">Failed to load data from API (${escapeHtml(lastApiError.message)}). Is JSON Server running on port 3000 or 3001? Try: <code>npm run server</code> or <code>npm run server:3001</code>.</td></tr>`;
    return;
  }
  if (!Array.isArray(list) || list.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8">No investments found. Add one above.</td></tr>';
    return;
  }

  tableBody.innerHTML = list.map((it) => {
    const roi = computeROI(it);
    const roiClass = roi >= 0 ? 'roi-pos' : 'roi-neg';
    const date = it.date ? new Date(it.date).toISOString().split('T')[0] : '';
    return `
      <tr data-id="${it.id}">
        <td>${escapeHtml(it.name)}</td>
        <td><span class="badge">${escapeHtml(it.category)}</span></td>
        <td class="num">${currency.format(safeNumber(it.amountInvested))}</td>
        <td class="num">${currency.format(safeNumber(it.currentValue))}</td>
        <td class="num ${roiClass}">${pct(roi)}</td>
        <td>${date}</td>
        <td class="notes-cell">${escapeHtml(it.notes || '')}</td>
        <td class="actions">
          <button class="btn btn-secondary btn-edit">Edit</button>
          <button class="btn btn-danger btn-delete">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function bindTableEvents() {
  tableBody.addEventListener('click', async (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const id = Number(row.dataset.id);

    if (e.target.classList.contains('btn-delete')) {
      if (confirm('Delete this investment?')) {
        try {
          await deleteInvestment(id);
          refresh();
        } catch (err) { alert(err.message); }
      }
    }

    if (e.target.classList.contains('btn-edit')) {
      enterEditMode(row, id);
    }

    if (e.target.classList.contains('btn-save')) {
      try {
        const patch = collectRowPatch(row);
        await updateInvestment(id, patch);
        exitEditMode(row);
        refresh();
      } catch (err) { alert(err.message); }
    }

    if (e.target.classList.contains('btn-cancel')) {
      exitEditMode(row, true);
    }
  });
}

function enterEditMode(row, id) {
  const tds = row.querySelectorAll('td');
  const inv = investments.find((i) => i.id === id);
  if (!inv) return;
  const date = inv.date ? new Date(inv.date).toISOString().split('T')[0] : '';

  // Name, category (select), invested, current, ROI(auto), date, notes, actions
  tds[0].innerHTML = `<input type="text" class="edt-name" value="${escapeAttr(inv.name)}" />`;
  tds[1].innerHTML = categorySelect(inv.category);
  tds[2].innerHTML = `<input type="number" step="0.01" min="0" class="edt-invested" value="${escapeAttr(inv.amountInvested)}" />`;
  tds[3].innerHTML = `<input type="number" step="0.01" min="0" class="edt-current" value="${escapeAttr(inv.currentValue)}" />`;
  tds[4].textContent = '—';
  tds[5].innerHTML = `<input type="date" class="edt-date" value="${date}" />`;
  tds[6].innerHTML = `<input type="text" class="edt-notes" value="${escapeAttr(inv.notes || '')}" />`;
  tds[7].innerHTML = `
    <button class="btn btn-primary btn-save">Save</button>
    <button class="btn btn-ghost btn-cancel">Cancel</button>
  `;
}

function exitEditMode(row, restore = false) {
  if (!restore) return; // We will refresh rows anyway after save; only restore on cancel
  const id = Number(row.dataset.id);
  const inv = investments.find((i) => i.id === id);
  if (!inv) return;
  const roi = computeROI(inv);
  const roiClass = roi >= 0 ? 'roi-pos' : 'roi-neg';
  const date = inv.date ? new Date(inv.date).toISOString().split('T')[0] : '';

  row.innerHTML = `
    <td>${escapeHtml(inv.name)}</td>
    <td><span class="badge">${escapeHtml(inv.category)}</span></td>
    <td class="num">${currency.format(safeNumber(inv.amountInvested))}</td>
    <td class="num">${currency.format(safeNumber(inv.currentValue))}</td>
    <td class="num ${roiClass}">${pct(roi)}</td>
    <td>${date}</td>
    <td class="notes-cell">${escapeHtml(inv.notes || '')}</td>
    <td class="actions">
      <button class="btn btn-secondary btn-edit">Edit</button>
      <button class="btn btn-danger btn-delete">Delete</button>
    </td>
  `;
}

function collectRowPatch(row) {
  const name = row.querySelector('.edt-name')?.value?.trim() || '';
  const category = row.querySelector('.edt-category')?.value || '';
  const amountInvested = safeNumber(row.querySelector('.edt-invested')?.value || 0);
  const currentValue = safeNumber(row.querySelector('.edt-current')?.value || 0);
  const date = row.querySelector('.edt-date')?.value || '';
  const notes = row.querySelector('.edt-notes')?.value || '';
  if (!name || !category || !date) throw new Error('Name, Category and Date are required');
  return { name, category, amountInvested, currentValue, date, notes };
}

function categorySelect(sel = '') {
  const opts = ['Stocks','Bonds','Crypto','Real Estate','Mutual Fund','ETF','Other']
    .map(o => `<option ${o===sel?'selected':''}>${o}</option>`).join('');
  return `<select class="edt-category">${opts}</select>`;
}

function renderCharts(list) {
  // Allocation Pie: current value by category
  const byCat = groupBy(list, (x) => x.category || 'Other');
  const catLabels = Object.keys(byCat);
  const catValues = catLabels.map((k) => byCat[k].reduce((s, i) => s + safeNumber(i.currentValue), 0));

  const pieCtx = document.getElementById('allocationPie');
  const barCtx = document.getElementById('categoryBar');

  const palette = [
    '#2dd4bf', '#5eead4', '#ffd8b5', '#ffe4c6', '#ffedd5', '#fbbf9a', '#fca5a5', '#fed7aa', '#fecaca'
  ];

  // Theme-aware colors from CSS variables
  const styles = getComputedStyle(document.documentElement);
  const textColor = (styles.getPropertyValue('--text') || '#0f172a').trim();
  const gridPeach = 'rgba(251, 191, 154, 0.35)';
  const primary = (styles.getPropertyValue('--primary') || '#5eead4').trim();
  const danger = (styles.getPropertyValue('--danger') || '#fb7185').trim();

  if (allocationPieChart) allocationPieChart.destroy();
  allocationPieChart = new Chart(pieCtx, {
    type: 'pie',
    data: { labels: catLabels, datasets: [{ data: catValues, backgroundColor: catLabels.map((_, i) => palette[i % palette.length]) }] },
    options: { plugins: { legend: { position: 'bottom', labels: { color: textColor } } } }
  });

  // Category Bar: net gain by category
  const catNet = catLabels.map((k) => {
    const s = byCat[k].reduce((acc, i) => acc + (safeNumber(i.currentValue) - safeNumber(i.amountInvested)), 0);
    return s;
  });

  if (categoryBarChart) categoryBarChart.destroy();
  categoryBarChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [{
        label: 'Net Gain/Loss',
        data: catNet,
        backgroundColor: catNet.map(v => v >= 0 ? primary : danger)
      }]
    },
    options: {
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridPeach } },
        y: { ticks: { color: textColor }, grid: { color: gridPeach } }
      },
      plugins: { legend: { labels: { color: textColor } } }
    }
  });
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, x) => {
    const k = keyFn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]+/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}
function escapeAttr(str) {
  return String(str).replace(/["'<>&]/g, (m) => ({ '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[m]));
}

function refresh() {
  const filtered = applyFilters(investments);
  renderSummary(filtered);
  renderTable(filtered);
  renderCharts(filtered);
}

function bindFilters() {
  [searchInput, filterCategory, dateFromInput, dateToInput].forEach(el => el.addEventListener('input', refresh));
  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterCategory.value = '';
    dateFromInput.value = '';
    dateToInput.value = '';
    refresh();
  });
}

function bindForm() {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    if (!data.name || !data.category || !data.date) {
      alert('Please fill Name, Category and Date');
      return;
    }
    try {
      await addInvestment(data);
      form.reset();
      refresh();
    } catch (err) {
      alert(err.message);
    }
  });
}

async function init() {
  setYear();
  bindForm();
  bindFilters();
  bindTableEvents();
  await fetchInvestments();
  refresh();
}

window.addEventListener('DOMContentLoaded', init);
