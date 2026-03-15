const DEFAULT_API = 'https://script.google.com/macros/s/AKfycbxwuedsFPTNuGoApwGIrEgVaSEu9MX07n3d0UmgyY04HQJ3biMDcTJCXggHW3iwHAacwA/exec';
const CK = 'lumicom_api_url';
const CACHE = 'lumicom_cache';
const CACHE_T = 'lumicom_cache_t';
const POLL_MS = 300000;

let pollTimer = null;
let listeners = [];

export function getApiUrl() {
  return localStorage.getItem(CK) || DEFAULT_API;
}

export function setApiUrl(url) {
  if (url) localStorage.setItem(CK, url);
  else localStorage.removeItem(CK);
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify(data, isLive) {
  listeners.forEach(fn => fn(data, isLive));
}

export async function fetchData(url) {
  if (!url) url = getApiUrl();
  try {
    const res = await fetch(url);
    const text = await res.text();
    const data = JSON.parse(text);
    localStorage.setItem(CACHE, text);
    localStorage.setItem(CACHE_T, Date.now().toString());
    notify(data, true);
    return { data, live: true };
  } catch (e) {
    const cached = loadCache();
    if (cached) { notify(cached, false); return { data: cached, live: false }; }
    throw e;
  }
}

export function loadCache() {
  try {
    const c = localStorage.getItem(CACHE);
    const t = localStorage.getItem(CACHE_T);
    if (c && t && (Date.now() - parseInt(t)) < 900000) return JSON.parse(c);
  } catch(e) {}
  return null;
}

export function startPolling() {
  stopPolling();
  const url = getApiUrl();
  if (!url) return;
  fetchData(url);
  pollTimer = setInterval(() => fetchData(url), POLL_MS);
}

export function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// Utility functions
export function fmtNum(n) {
  return parseFloat(n || 0).toLocaleString('it-IT');
}

export function fmtPct(curr, prev) {
  if (!prev || prev === 0) return { text: '', cls: '' };
  const pct = ((curr - prev) / Math.abs(prev) * 100).toFixed(1);
  const cls = pct >= 0 ? 'up' : 'down';
  const sign = pct >= 0 ? '+' : '';
  return { text: sign + pct + '%', cls };
}

// Process raw API data into structured dashboard data
export function processData(raw) {
  if (!raw) return null;
  const gac = raw['google_ads___campagne'];
  const gad = raw['google_ads___giornaliero'];
  const ma = raw['meta_ads'];
  const bt = raw['budget_tracker'];
  const al = raw['alert_log'];
  const storico = raw['storico_mensile'];

  // Current month filter
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const monthPrefix = `${curYear}-${String(curMonth).padStart(2,'0')}`;

  // KPIs mese corrente from daily Google Ads data
  let totSpesa = 0, totConv = 0, totClick = 0, totImpr = 0, totValConv = 0;
  if (gad && gad.rows) {
    gad.rows.forEach(r => {
      const dateStr = (r[0] || '').toString().slice(0, 7);
      if (dateStr !== monthPrefix) return;
      totSpesa += parseFloat(r[8] || 0);
      totConv += parseFloat(r[9] || 0);
      totClick += parseInt(r[5] || 0);
      totImpr += parseInt(r[4] || 0);
      totValConv += parseFloat(r[11] || 0);
    });
  }
  // Add Meta Ads current month
  if (ma && ma.rows) {
    ma.rows.forEach(r => {
      if (typeof r[0] === 'string' && r[0].indexOf('In attesa') >= 0) return;
      const dateStr = (r[0] || '').toString().slice(0, 7);
      if (dateStr !== monthPrefix) return;
      totSpesa += parseFloat(r[10] || 0);
      totConv += parseFloat(r[11] || 0);
      totClick += parseInt(r[7] || 0);
      totImpr += parseInt(r[5] || 0);
      totValConv += parseFloat(r[13] || 0);
    });
  }

  const avgCtr = totImpr > 0 ? (totClick / totImpr * 100) : 0;
  const avgRoas = totSpesa > 0 ? (totValConv / totSpesa) : 0;
  const avgCpc = totClick > 0 ? (totSpesa / totClick) : 0;

  // YoY from storico_mensile
  let prevSpesa = 0, prevConv = 0, prevClick = 0, prevRoas = 0, prevCtr = 0, prevCpc = 0;
  if (storico && storico.rows && storico.rows.length > 0) {
    const targetMonth = curMonth;
    const targetYear = curYear - 1;
    const prevRow = storico.rows.find(r => {
      return parseInt(r[1]) === targetMonth && parseInt(r[0]) === targetYear;
    });
    if (prevRow) {
      prevSpesa = parseFloat(prevRow[2] || 0);
      prevConv = parseFloat(prevRow[4] || 0);
      prevClick = parseFloat(prevRow[5] || 0);
      prevRoas = parseFloat(prevRow[3] || 0);
      prevCtr = parseFloat(prevRow[6] || 0);
      prevCpc = parseFloat(prevRow[7] || 0);
    }
  }

  // Platform distribution (from daily data mese corrente)
  let gSpesa = 0, mSpesa = 0;
  if (gad && gad.rows) {
    gad.rows.forEach(r => {
      const dateStr = (r[0] || '').toString().slice(0, 7);
      if (dateStr !== monthPrefix) return;
      gSpesa += parseFloat(r[8] || 0);
    });
  }
  if (ma && ma.rows) {
    ma.rows.forEach(r => {
      if (typeof r[0] === 'string' && r[0].indexOf('In attesa') >= 0) return;
      const dateStr = (r[0] || '').toString().slice(0, 7);
      if (dateStr !== monthPrefix) return;
      mSpesa += parseFloat(r[10] || 0);
    });
  }
  const totalPlatform = gSpesa + mSpesa;
  const gPct = totalPlatform > 0 ? Math.round(gSpesa / totalPlatform * 100) : 0;
  const mPct = 100 - gPct;

  // Market performance (from campagne - cumulative totals for now)
  const markets = { IT: {spend:0,val:0}, FR: {spend:0,val:0}, DE: {spend:0,val:0} };
  if (gac && gac.rows) gac.rows.forEach(r => {
    const name = (r[0] || '').toString();
    const spend = parseFloat(r[8] || 0);
    const valc = parseFloat(r[11] || 0);
    if (name.match(/IT-/i)) { markets.IT.spend += spend; markets.IT.val += valc; }
    if (name.match(/FR-/i)) { markets.FR.spend += spend; markets.FR.val += valc; }
    if (name.match(/DE-/i)) { markets.DE.spend += spend; markets.DE.val += valc; }
  });
  if (ma && ma.rows) ma.rows.forEach(r => {
    if (typeof r[0] === 'string' && r[0].indexOf('In attesa') >= 0) return;
    const name = (r[1] || '').toString();
    const spend = parseFloat(r[10] || 0);
    const valc = parseFloat(r[13] || 0);
    if (name.match(/IT-/i)) { markets.IT.spend += spend; markets.IT.val += valc; }
    if (name.match(/FR-/i)) { markets.FR.spend += spend; markets.FR.val += valc; }
    if (name.match(/DE-/i)) { markets.DE.spend += spend; markets.DE.val += valc; }
  });

  // Google campaigns
  const googleCampaigns = [];
  if (gac && gac.rows) gac.rows.forEach(row => {
    if ((row[2] || '') === 'In pausa') return;
    googleCampaigns.push({
      name: (row[0] || '').replace('LumicomShopITL - ', ''),
      type: row[1] || '',
      roas: parseFloat(row[12] || 0),
      spend: parseFloat(row[8] || 0),
      ctr: parseFloat(row[6] || 0),
      cpc: parseFloat(row[7] || 0),
      conv: parseFloat(row[9] || 0),
      market: (row[0] || '').match(/IT-/i) ? 'IT' : ((row[0] || '').match(/FR-/i) ? 'FR' : ((row[0] || '').match(/DE-/i) ? 'DE' : ''))
    });
  });

  // Meta campaigns
  const metaCampaigns = [];
  if (ma && ma.rows) ma.rows.forEach(row => {
    if (typeof row[0] === 'string' && row[0].indexOf('In attesa') >= 0) return;
    metaCampaigns.push({
      name: (row[1] || '').replace(/\[MOCA\]\s*/, '').replace('LumicomShopITL - ', '').replace('LumicomShopITL- ', ''),
      type: row[3] || '',
      roas: parseFloat(row[14] || 0),
      spend: parseFloat(row[10] || 0),
      ctr: parseFloat(row[8] || 0),
      cpc: parseFloat(row[9] || 0),
      conv: parseFloat(row[11] || 0),
      market: (row[1] || '').match(/IT-/i) ? 'IT' : ((row[1] || '').match(/FR-/i) ? 'FR' : ((row[1] || '').match(/DE-/i) ? 'DE' : ''))
    });
  });

  // Daily spend chart data (current month)
  const dailySpend = {};
  if (gad && gad.rows) gad.rows.forEach(r => {
    const d = (r[0] || '').toString().slice(0, 10);
    if (!d.startsWith(monthPrefix)) return;
    if (!dailySpend[d]) dailySpend[d] = 0;
    dailySpend[d] += parseFloat(r[8] || 0);
  });

  // Budget
  let budget = { total: 0, spent: 0, gBudget: 0, gSpent: 0, mBudget: 0, mSpent: 0 };
  if (bt && bt.rows && bt.rows.length >= 2) {
    budget.gBudget = parseFloat(bt.rows[0][2] || 0);
    budget.gSpent = parseFloat(bt.rows[0][3] || 0);
    budget.mBudget = parseFloat(bt.rows[1][2] || 0);
    budget.mSpent = parseFloat(bt.rows[1][3] || 0);
    budget.total = budget.gBudget + budget.mBudget;
    budget.spent = budget.gSpent + budget.mSpent;
  }

  // Alerts
  const alerts = [];
  if (al && al.rows) al.rows.forEach(r => {
    if ((r[9] || '').indexOf('Aperto') >= 0) {
      alerts.push({
        date: r[0], platform: r[1], campaign: r[2],
        title: r[3], severity: (r[7] || '').toLowerCase().indexOf('alta') >= 0 ? 'high' : 'medium',
        action: r[8], status: r[9]
      });
    }
  });

  return {
    kpi: { spesa: totSpesa, roas: avgRoas, conv: totConv, ctr: avgCtr, click: totClick, cpc: avgCpc,
           prevSpesa, prevRoas, prevConv, prevCtr, prevClick, prevCpc },
    platform: { gPct, mPct, gSpesa, mSpesa },
    markets, dailySpend, googleCampaigns, metaCampaigns, budget, alerts
  };
}
