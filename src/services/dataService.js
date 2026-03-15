const DEFAULT_API = 'https://script.google.com/macros/s/AKfycby8w2fKRJEdlOYV5Y0tAfa0lM4hQZkZJlFRA8SVjZa4yW2uibTnBAfFyOXGDEDvb6h1SQ/exec';
const CK = 'lumicom_api_url';
const CACHE = 'lumicom_cache';
const CACHE_T = 'lumicom_cache_t';
const POLL_MS = 300000;
let pollTimer = null;
let listeners = [];
export function getApiUrl() { return localStorage.getItem(CK) || DEFAULT_API; }
export function setApiUrl(url) { if (url) localStorage.setItem(CK, url); else localStorage.removeItem(CK); }
export function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn); }; }
function notify(data, isLive) { listeners.forEach(fn => fn(data, isLive)); }
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
  try { const c = localStorage.getItem(CACHE); const t = localStorage.getItem(CACHE_T); if (c && t && (Date.now() - parseInt(t)) < 900000) return JSON.parse(c); } catch(e) {}
  return null;
}
export function startPolling() { stopPolling(); const url = getApiUrl(); if (!url) return; fetchData(url); pollTimer = setInterval(() => fetchData(url), POLL_MS); }
export function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
export function fmtNum(n) { return parseFloat(n || 0).toLocaleString('it-IT'); }
export function fmtPct(curr, prev) {
  if (!prev || prev === 0) return { text: '', cls: '' };
  const pct = ((curr - prev) / Math.abs(prev) * 100).toFixed(1);
  const cls = pct >= 0 ? 'up' : 'down';
  const sign = pct >= 0 ? '+' : '';
  return { text: sign + pct + '%', cls };
}

// Period helper: returns {start, end, prevStart, prevEnd, label}
export function getPeriodDates(period) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const pad = n => String(n).padStart(2, '0');
  const fmt = dt => dt.getFullYear() + '-' + pad(dt.getMonth()+1) + '-' + pad(dt.getDate());
  let start, end, prevStart, prevEnd, label;
  if (period === 'last7') {
    start = new Date(y, m, d - 6); end = now;
    prevStart = new Date(y - 1, m, d - 6); prevEnd = new Date(y - 1, m, d);
    label = 'Ultimi 7 giorni';
  } else if (period === 'last30') {
    start = new Date(y, m, d - 29); end = now;
    prevStart = new Date(y - 1, m, d - 29); prevEnd = new Date(y - 1, m, d);
    label = 'Ultimi 30 giorni';
  } else if (period === 'prevMonth') {
    start = new Date(y, m - 1, 1); end = new Date(y, m, 0);
    prevStart = new Date(y - 1, m - 1, 1); prevEnd = new Date(y - 1, m, 0);
    const mn = start.toLocaleString('it-IT', {month:'long'});
    label = mn.charAt(0).toUpperCase() + mn.slice(1) + ' ' + start.getFullYear();
  } else {
    start = new Date(y, m, 1); end = now;
    prevStart = new Date(y - 1, m, 1); prevEnd = new Date(y - 1, m, d);
    label = '1-' + d + ' ' + now.toLocaleString('it-IT', {month:'short'}) + ' ' + y;
  }
  return { start: fmt(start), end: fmt(end), prevStart: fmt(prevStart), prevEnd: fmt(prevEnd), label };
}

// Filter date helper
function inRange(dateStr, start, end) {
  const d = (dateStr || '').toString().slice(0, 10).replace(/T.*/, '');
  return d >= start && d <= end;
}

export function processData(raw, period) {
  if (!raw) return null;
  const gac = raw['google_ads___campagne'];
  const gad = raw['google_ads___giornaliero'];
  const ma = raw['meta_ads'];
  const bt = raw['budget_tracker'];
  const al = raw['alert_log'];
  const storico = raw['storico_mensile'];
  const analytics = raw['analytics'];
  const p = getPeriodDates(period || 'mtd');
  // KPIs from daily Google Ads data filtered by period
  let totSpesa=0, totConv=0, totClick=0, totImpr=0, totValConv=0;
  if (gad && gad.rows) {
    gad.rows.forEach(r => {
      const ds = (r[0]||'').toString().slice(0,10);
      if (!inRange(ds, p.start, p.end)) return;
      totSpesa += parseFloat(r[8]||0);
      totConv += parseFloat(r[9]||0);
      totClick += parseInt(r[5]||0);
      totImpr += parseInt(r[4]||0);
      totValConv += parseFloat(r[11]||0);
    });
  }
  if (ma && ma.rows) {
    ma.rows.forEach(r => {
      if (typeof r[0]==='string' && r[0].indexOf('In attesa')>=0) return;
      const ds = (r[0]||'').toString().slice(0,10);
      if (!inRange(ds, p.start, p.end)) return;
      totSpesa += parseFloat(r[10]||0);
      totConv += parseFloat(r[11]||0);
      totClick += parseInt(r[7]||0);
      totImpr += parseInt(r[5]||0);
      totValConv += parseFloat(r[13]||0);
    });
  }
  const avgCtr = totImpr > 0 ? (totClick/totImpr*100) : 0;
  const avgRoas = totSpesa > 0 ? (totValConv/totSpesa) : 0;
  const avgCpc = totClick > 0 ? (totSpesa/totClick) : 0;
  // Previous period from storico
  let prevSpesa=0, prevConv=0, prevClick=0, prevImpr=0, prevValConv=0;
  let prevRoas=0, prevCtr=0, prevCpc=0;
  if (storico && storico.rows) {
    storico.rows.filter(r => {
      const d = (r[0]||'').toString().slice(0,10);
      return d >= p.prevStart && d <= p.prevEnd;
    }).forEach(r => {
      prevSpesa += parseFloat(r[1]||0);
      prevClick += parseInt(r[2]||0);
      prevImpr += parseInt(r[3]||0);
      prevConv += parseFloat(r[4]||0);
      prevValConv += parseFloat(r[5]||0);
    });
    prevRoas = prevSpesa > 0 ? (prevValConv/prevSpesa) : 0;
    prevCtr = prevImpr > 0 ? (prevClick/prevImpr*100) : 0;
    prevCpc = prevClick > 0 ? (prevSpesa/prevClick) : 0;
  }
  // Analytics GA4 data
  let ga = { sessions:0, users:0, newUsers:0, bounceRate:0, avgDuration:0, pageViews:0, pvPerSession:0, purchases:0, revenue:0, conversions:0 };
  let gaPrev = { ...ga };
  if (analytics) {
    if (analytics.current && !analytics.current.error) {
      ga.sessions = analytics.current.sessions || 0;
      ga.users = analytics.current.totalUsers || 0;
      ga.newUsers = analytics.current.newUsers || 0;
      ga.bounceRate = analytics.current.bounceRate || 0;
      ga.avgDuration = analytics.current.averageSessionDuration || 0;
      ga.pageViews = analytics.current.screenPageViews || 0;
      ga.pvPerSession = analytics.current.screenPageViewsPerSession || 0;
      ga.purchases = analytics.current.ecommercePurchases || 0;
      ga.revenue = analytics.current.purchaseRevenue || 0;
      ga.conversions = analytics.current.conversions || 0;
    }
    if (analytics.previous && !analytics.previous.error) {
      gaPrev.sessions = analytics.previous.sessions || 0;
      gaPrev.users = analytics.previous.totalUsers || 0;
      gaPrev.newUsers = analytics.previous.newUsers || 0;
      gaPrev.bounceRate = analytics.previous.bounceRate || 0;
      gaPrev.avgDuration = analytics.previous.averageSessionDuration || 0;
      gaPrev.pageViews = analytics.previous.screenPageViews || 0;
      gaPrev.pvPerSession = analytics.previous.screenPageViewsPerSession || 0;
      gaPrev.purchases = analytics.previous.ecommercePurchases || 0;
      gaPrev.revenue = analytics.previous.purchaseRevenue || 0;
      gaPrev.conversions = analytics.previous.conversions || 0;
    }
  }
  // Platform distribution filtered by period
  let gSpesa=0, mSpesa=0;
  if (gad && gad.rows) gad.rows.forEach(r => { if (inRange((r[0]||'').toString().slice(0,10), p.start, p.end)) gSpesa += parseFloat(r[8]||0); });
  if (ma && ma.rows) ma.rows.forEach(r => { if (typeof r[0]==='string' && r[0].indexOf('In attesa')>=0) return; if (inRange((r[0]||'').toString().slice(0,10), p.start, p.end)) mSpesa += parseFloat(r[10]||0); });
  const totalPlatform = gSpesa + mSpesa;
  const gPct = totalPlatform > 0 ? Math.round(gSpesa/totalPlatform*100) : 0;
  const mPct = 100 - gPct;
  // Market performance
  const markets = { IT:{spend:0,val:0}, FR:{spend:0,val:0}, DE:{spend:0,val:0} };
  if (gac && gac.rows) gac.rows.forEach(r => {
    const name=(r[0]||'').toString(), spend=parseFloat(r[8]||0), valc=parseFloat(r[11]||0);
    if (name.match(/IT-/i)) { markets.IT.spend+=spend; markets.IT.val+=valc; }
    if (name.match(/FR-/i)) { markets.FR.spend+=spend; markets.FR.val+=valc; }
    if (name.match(/DE-/i)) { markets.DE.spend+=spend; markets.DE.val+=valc; }
  });
  if (ma && ma.rows) ma.rows.forEach(r => {
    if (typeof r[0]==='string' && r[0].indexOf('In attesa')>=0) return;
    const name=(r[1]||'').toString(), spend=parseFloat(r[10]||0), valc=parseFloat(r[13]||0);
    if (name.match(/IT-/i)) { markets.IT.spend+=spend; markets.IT.val+=valc; }
    if (name.match(/FR-/i)) { markets.FR.spend+=spend; markets.FR.val+=valc; }
    if (name.match(/DE-/i)) { markets.DE.spend+=spend; markets.DE.val+=valc; }
  });
  const mkRoas = m => m.spend > 0 ? (m.val/m.spend).toFixed(2) : '0';
  // Google campaigns
  const googleCampaigns = [];
  if (gac && gac.rows) gac.rows.forEach(row => {
    if ((row[2]||'')==='In pausa') return;
    googleCampaigns.push({ name:(row[0]||'').replace('LumicomShopITL - ',''), type:row[1]||'', roas:parseFloat(row[12]||0), spend:parseFloat(row[8]||0), ctr:parseFloat(row[6]||0), cpc:parseFloat(row[7]||0), conv:parseFloat(row[9]||0), market:(row[0]||'').match(/IT-/i)?'IT':((row[0]||'').match(/FR-/i)?'FR':((row[0]||'').match(/DE-/i)?'DE':'')) });
  });
  // Meta campaigns
  const metaCampaigns = [];
  if (ma && ma.rows) ma.rows.forEach(row => {
    if (typeof row[0]==='string' && row[0].indexOf('In attesa')>=0) return;
    metaCampaigns.push({ name:(row[1]||'').replace(/\[MOCA\]\s*/,'').replace('LumicomShopITL - ','').replace('LumicomShopITL- ',''), type:row[3]||'', roas:parseFloat(row[14]||0), spend:parseFloat(row[10]||0), ctr:parseFloat(row[8]||0), cpc:parseFloat(row[9]||0), conv:parseFloat(row[11]||0), market:(row[1]||'').match(/IT-/i)?'IT':((row[1]||'').match(/FR-/i)?'FR':((row[1]||'').match(/DE-/i)?'DE':'')) });
  });
  // Daily spend chart data filtered by period
  const dailySpend = {};
  if (gad && gad.rows) gad.rows.forEach(r => {
    const d=(r[0]||'').toString().slice(0,10);
    if (!inRange(d, p.start, p.end)) return;
    if (!dailySpend[d]) dailySpend[d]=0;
    dailySpend[d] += parseFloat(r[8]||0);
  });
  // Budget
  let budget = { total:0, spent:0, gBudget:0, gSpent:0, mBudget:0, mSpent:0 };
  if (bt && bt.rows && bt.rows.length>=2) {
    budget.gBudget=parseFloat(bt.rows[0][2]||0); budget.gSpent=parseFloat(bt.rows[0][3]||0);
    budget.mBudget=parseFloat(bt.rows[1][2]||0); budget.mSpent=parseFloat(bt.rows[1][3]||0);
    budget.total=budget.gBudget+budget.mBudget; budget.spent=budget.gSpent+budget.mSpent;
  }
  // Alerts
  const alerts = [];
  if (al && al.rows) al.rows.forEach(r => {
    if ((r[9]||'').indexOf('Aperto')>=0) alerts.push({ date:r[0], platform:r[1], campaign:r[2], title:r[3], severity:(r[7]||'').toLowerCase().indexOf('alta')>=0?'high':'medium', action:r[8], status:r[9] });
  });
  return {
    kpi: { spesa:totSpesa, roas:avgRoas, conv:totConv, ctr:avgCtr, click:totClick, cpc:avgCpc, valConv:totValConv, prevSpesa, prevRoas, prevConv, prevCtr, prevClick, prevCpc, prevValConv, periodLabel:p.label },
    ga, gaPrev,
    gaChannels: analytics ? analytics.channels : [],
    gaDaily: analytics ? analytics.daily : [],
    platform: { gPct, mPct, gSpesa, mSpesa },
    markets, dailySpend, googleCampaigns, metaCampaigns, budget, alerts,
    period: p
  };
}
