'use strict';

// ── Viz URLs — replace with your Tableau Cloud paths ────────────────────────
const VIZ_URLS = {
  dashboard: TABLEAU_VIZ_URL,  // injected from Flask template
  salesmap:  TABLEAU_VIZ_URL.replace(/\/[^/]+$/, '/SalesMap'),
  trends:    TABLEAU_VIZ_URL.replace(/\/[^/]+$/, '/SalesTrends'),
};

// ── UAF label map ────────────────────────────────────────────────────────────
const USER_LABELS = {
  user_east:  'East region only',
  user_west:  'West region only',
  user_all:   'All regions (admin)',
};

let viz;
let activeFilterSheet = null;

// ── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  viz = document.getElementById('tableauViz');

  // Update UAF display
  document.getElementById('uafValue').textContent =
    USER_LABELS[CURRENT_USER] || CURRENT_USER;

  document.getElementById('uafInfo').title =
    `JWT claim: "myuaf": ${JSON.stringify(UAF_VALUES)}`;

  // Events
  viz.addEventListener('firstinteractive', onVizReady);
  viz.addEventListener('markselectionchanged', onMarkSelected);

  // JWT badge click
  document.getElementById('jwtBadge').addEventListener('click', toggleJwtPanel);

  // Decode and show JWT payload
  renderJwtPayload(JWT_TOKEN);
});

// ── Viz ready ────────────────────────────────────────────────────────────────
async function onVizReady() {
  await loadDynamicFilters();
}

// ── Dynamic filter: read Category values from the viz ───────────────────────
async function loadDynamicFilters() {
  const container = document.getElementById('dynFilterContainer');
  container.innerHTML = '<span class="loading-text">Loading...</span>';

  try {
    const wb = viz.workbook;
    const sheets = wb.publishedSheetsInfo;

    // Find 'Sales Map' sheet (or first sheet available)
    let targetSheet = sheets.find(s => s.name === 'Sales Map') || sheets[0];
    if (!targetSheet) return;

    const sheet = await wb.activateSheetAsync(targetSheet.name);
    activeFilterSheet = sheet;
    const filters = await sheet.getFiltersAsync();

    container.innerHTML = '';

    for (const filter of filters) {
      if (filter.fieldName === 'Category') {
        const values = filter.appliedValues.length
          ? filter.appliedValues.map(v => v.value)
          : filter.appliedValues;

        // Get domain values via the filter's domain
        const domainValues = await getDomainValues(sheet, filter.fieldName);
        domainValues.forEach(val => {
          const btn = document.createElement('button');
          btn.className = 'chip';
          btn.textContent = val;
          btn.onclick = () => applyFilter('Category', [val], btn);
          container.appendChild(btn);
        });

        // Clear button
        const clear = document.createElement('button');
        clear.className = 'chip chip-clear';
        clear.textContent = '✕ Clear';
        clear.onclick = () => clearFilter('Category');
        container.appendChild(clear);
        break;
      }
    }

    if (!container.children.length) {
      container.innerHTML = '<span class="loading-text">No categorical filters found</span>';
    }
  } catch (e) {
    container.innerHTML = '<span class="loading-text">Could not load filters</span>';
    console.warn('Dynamic filter load failed:', e);
  }
}

async function getDomainValues(sheet, fieldName) {
  try {
    const filters = await sheet.getFiltersAsync();
    const f = filters.find(x => x.fieldName === fieldName);
    if (!f) return [];
    // CategoricalFilter has a .domain property in API v3
    return f.domain?.map(d => d.value) ?? ['Furniture', 'Office Supplies', 'Technology'];
  } catch {
    return ['Furniture', 'Office Supplies', 'Technology'];
  }
}

// ── Filter functions ─────────────────────────────────────────────────────────
async function applyFilter(fieldName, values, btnEl) {
  if (!activeFilterSheet) return;
  try {
    await activeFilterSheet.applyFilterAsync(
      fieldName,
      values,
      tableau.FilterUpdateType.Replace
    );
    // Update chip active state
    if (btnEl) {
      const siblings = btnEl.parentElement.querySelectorAll('.chip:not(.chip-clear)');
      siblings.forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
  } catch (e) {
    console.warn('Filter error:', e);
  }
}

async function clearFilter(fieldName) {
  if (!activeFilterSheet) return;
  try {
    await activeFilterSheet.clearFilterAsync(fieldName);
    // Clear all active chips in both filter sections
    document.querySelectorAll('.chip.active').forEach(b => b.classList.remove('active'));
  } catch (e) {
    console.warn('Clear filter error:', e);
  }
}

// ── Mark selection → Wikipedia ───────────────────────────────────────────────
async function onMarkSelected(event) {
  const marks = await event.detail.getMarksAsync();
  if (!marks || marks.length === 0) return;

  const pairs = marks[0].pairs;
  const statePair = pairs.find(p => p.fieldName === 'State' || p.fieldName === 'state');
  if (!statePair) return;

  const stateName = statePair.value;
  document.getElementById('markTitle').textContent = stateName;
  document.getElementById('wikiFrame').src =
    `https://en.wikipedia.org/wiki/${encodeURIComponent(stateName)}`;
  document.getElementById('markPanel').style.display = 'block';
}

// ── Viz switcher ─────────────────────────────────────────────────────────────
function switchViz(key, btnEl) {
  const url = VIZ_URLS[key];
  if (!url || !viz) return;

  viz.src = url;
  activeFilterSheet = null;
  document.getElementById('vizTitle').textContent =
    btnEl ? btnEl.textContent : key;

  // Button state
  document.querySelectorAll('.viz-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  // Reset dynamic filters
  document.getElementById('dynFilterContainer').innerHTML =
    '<span class="loading-text">Loading from viz...</span>';

  viz.addEventListener('firstinteractive', onVizReady, { once: true });
}

// ── User switcher (triggers full page reload via Flask to re-issue JWT) ──────
function switchUser(userKey) {
  window.location.href = `/switch-user?user=${userKey}`;
}

// ── JWT panel ────────────────────────────────────────────────────────────────
function toggleJwtPanel() {
  const panel = document.getElementById('jwtPanel');
  const overlay = document.getElementById('modalOverlay');
  panel.classList.toggle('open');
  overlay.classList.toggle('visible');
}

function renderJwtPayload(token) {
  if (!token || token === 'None') {
    document.getElementById('jwtPayload').textContent = 'No token available.\nRun the Flask backend to generate a JWT.';
    return;
  }
  try {
    const parts = token.split('.');
    if (parts.length < 2) throw new Error('invalid');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    document.getElementById('jwtPayload').textContent = JSON.stringify(payload, null, 2);
  } catch {
    document.getElementById('jwtPayload').textContent = 'Could not decode token.';
  }
}
