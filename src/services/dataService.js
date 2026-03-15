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

// Period helper
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
function inRange(dateStr, start, end) {
  const d = (dateStr || '').toString().slice(0, 10).replace(/T.*/, '');
  return d >= start && d <= end;
}

// Helper: aggregate daily rows by campaign name
function aggregateByCampaign(rows, startD, endD) {
  const map = {};
  rows.forEach(r => {
    const ds = (r[0]||'').toString().slice(0,10);
    if (!inRange(ds, startD, endD)) return;
    if ((r[3]||'')==='In pausa') return;
    const name = (r[1]||'').replace('LumicomShopITL - ','');
    if (!name) return;
    if (!map[name]) map[name] = {name, type:r[2]||'', spend:0, click:0, impr:0, conv:0, valConv:0};
    map[name].spend += parseFloat(r[8]||0);
    map[name].click += parseInt(r[5]||0);
    map[name].impr += parseInt(r[4]||0);
    map[name].conv += parseFloat(r[9]||0);
    map[name].valConv += parseFloat(r[11]||0);
  });
  return Object.values(map).map(c => ({
    name: c.name,
    type: c.type,
    spend: c.spend,
    roas: c.spend > 0 ? c.valConv / c.spend : 0,
    ctr: c.impr > 0 ? (c.click / c.impr * 100) : 0,
    cpc: c.click > 0 ? c.spend / c.click : 0,
    conv: c.conv,
    valConv: c.valConv,
    market: c.name.match(/IT-/i)?'IT':(c.name.match(/FR-/i)?'FR':(c.name.match(/DE-/i)?'DE':''))
  })).sort((a,b) => b.spend - a.spend);
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

  // Analytics GA4
  let ga = {sessions:0,users:0,newUsers:0,bounceRate:0,avgDuration:0,pageViews:0,pvPerSession:0,purchases:0,revenue:0,conversions:0};
  let gaPrev = {...ga};
  if (analytics) {
    if (analytics.current && !analytics.current.error) {
      ga.sessions=analytics.current.sessions||0; ga.users=analytics.current.totalUsers||0;
      ga.newUsers=analytics.current.newUsers||0; ga.bounceRate=analytics.current.bounceRate||0;
      ga.avgDuration=analytics.current.averageSessionDuration||0; ga.pageViews=analytics.current.screenPageViews||0;
      ga.pvPerSession=analytics.current.screenPageViewsPerSession||0; ga.purchases=analytics.current.ecommercePurchases||0;
      ga.revenue=analytics.current.purchaseRevenue||0; ga.conversions=analytics.current.conversions||0;
    }
    if (analytics.previous && !analytics.previous.error) {
      gaPrev.sessions=analytics.previous.sessions||0; gaPrev.users=analytics.previous.totalUsers||0;
      gaPrev.newUsers=analytics.previous.newUsers||0; gaPrev.bounceRate=analytics.previous.bounceRate||0;
      gaPrev.avgDuration=analytics.previous.averageSessionDuration||0; gaPrev.pageViews=analytics.previous.screenPageViews||0;
      gaPrev.pvPerSession=analytics.previous.screenPageViewsPerSession||0; gaPrev.purchases=analytics.previous.ecommercePurchases||0;
      gaPrev.revenue=analytics.previous.purchaseRevenue||0; gaPrev.conversions=analytics.previous.conversions||0;
    }
  }

  // Platform distribution filtered by period
  let gSpesa=0, mSpesa=0;
  if (gad && gad.rows) gad.rows.forEach(r => { if (inRange((r[0]||'').toString().slice(0,10), p.start, p.end)) gSpesa += parseFloat(r[8]||0); });
  if (ma && ma.rows) ma.rows.forEach(r => { if (typeof r[0]==='string' && r[0].indexOf('In attesa')>=0) return; if (inRange((r[0]||'').toString().slice(0,10), p.start, p.end)) mSpesa += parseFloat(r[10]||0); });
  const totalPlatform = gSpesa + mSpesa;
  const gPct = totalPlatform > 0 ? Math.round(gSpesa/totalPlatform*100) : 0;
  const mPct = 100 - gPct;

  // Market performance filtered by period from daily data
  const markets = { IT:{spend:0,val:0}, FR:{spend:0,val:0}, DE:{spend:0,val:0} };
  if (gad && gad.rows) gad.rows.forEach(r => {
    const ds = (r[0]||'').toString().slice(0,10);
    if (!inRange(ds, p.start, p.end)) return;
    const name=(r[1]||'').toString(), spend=parseFloat(r[8]||0), valc=parseFloat(r[11]||0);
    if (name.match(/IT-/i)) { markets.IT.spend+=spend; markets.IT.val+=valc; }
    if (name.match(/FR-/i)) { markets.FR.spend+=spend; markets.FR.val+=valc; }
    if (name.match(/DE-/i)) { markets.DE.spend+=spend; markets.DE.val+=valc; }
  });

  // Google campaigns aggregated from daily data by period
  const googleCampaigns = (gad && gad.rows) ? aggregateByCampaign(gad.rows, p.start, p.end) : [];
  // Previous period campaigns for YoY comparison
  const prevGoogleCampaigns = (gad && gad.rows) ? aggregateByCampaign(gad.rows, p.prevStart, p.prevEnd) : [];
  // Build prev lookup by name
  const prevCampMap = {};
  prevGoogleCampaigns.forEach(c => { prevCampMap[c.name] = c; });
  // Attach prev data to current campaigns
  googleCampaigns.forEach(c => { c.prev = prevCampMap[c.name] || null; });

  // Meta campaigns (from meta_ads sheet - already has totals, no daily breakdown available)
  const metaCampaigns = [];
  if (ma && ma.rows) ma.rows.forEach(row => {
    if (typeof row[0]==='string' && row[0].indexOf('In attesa')>=0) return;
    const ds = (row[0]||'').toString().slice(0,10);
    if (!inRange(ds, p.start, p.end)) return;
    const name = (row[1]||'').replace(/\[MOCA\]\s*/,'').replace('LumicomShopITL - ','').replace('LumicomShopITL- ','');
    const existing = metaCampaigns.find(c => c.name === name);
    if (existing) {
      existing.spend += parseFloat(row[10]||0);
      existing.conv += parseFloat(row[11]||0);
      existing.valConv += parseFloat(row[13]||0);
      existing.click += parseInt(row[7]||0);
      existing.impr += parseInt(row[5]||0);
    } else {
      metaCampaigns.push({
        name, type:row[3]||'',
        spend:parseFloat(row[10]||0), conv:parseFloat(row[11]||0),
        valConv:parseFloat(row[13]||0), click:parseInt(row[7]||0), impr:parseInt(row[5]||0),
        roas:0, ctr:0, cpc:0, prev:null,
        market:name.match(/IT-/i)?'IT':(name.match(/FR-/i)?'FR':(name.match(/DE-/i)?'DE':''))
      });
    }
  });
  metaCampaigns.forEach(c => {
    c.roas = c.spend > 0 ? c.valConv / c.spend : 0;
    c.ctr = c.impr > 0 ? (c.click / c.impr * 100) : 0;
    c.cpc = c.click > 0 ? c.spend / c.click : 0;
  });
  metaCampaigns.sort((a,b) => b.spend - a.spend);

  // Daily spend chart
  const dailySpend = {};
  if (gad && gad.rows) gad.rows.forEach(r => {
    const d=(r[0]||'').toString().slice(0,10);
    if (!inRange(d, p.start, p.end)) return;
    if (!dailySpend[d]) dailySpend[d]=0;
    dailySpend[d] += parseFloat(r[8]||0);
  });

  // Budget
  let budget = {total:0,spent:0,gBudget:0,gSpent:0,mBudget:0,mSpent:0};
  if (bt && bt.rows && bt.rows.length>=2) {
    budget.gBudget=parseFloat(bt.rows[0][2]||0); budget.gSpent=parseFloat(bt.rows[0][3]||0);
    budget.mBudget=parseFloat(bt.rows[1][2]||0); budget.mSpent=parseFloat(bt.rows[1][3]||0);
    budget.total=budget.gBudget+budget.mBudget; budget.spent=budget.gSpent+budget.mSpent;
  }

  // Alerts
  const alerts = [];
  if (al && al.rows) al.rows.forEach(r => {
    if ((r[9]||'').indexOf('Aperto')>=0) alerts.push({
      date:r[0], platform:r[1], campaign:r[2], title:r[3],
      severity:(r[7]||'').toLowerCase().indexOf('alta')>=0?'high':'medium',
      action:r[8], status:r[9]
    });
  });

  return {
    kpi: { spesa:totSpesa, roas:avgRoas, conv:totConv, ctr:avgCtr, click:totClick, cpc:avgCpc, valConv:totValConv,
      prevSpesa, prevRoas, prevConv, prevCtr, prevClick, prevCpc, prevValConv, periodLabel:p.label },
    ga, gaPrev, gaChannels: analytics ? analytics.channels : [], gaDaily: analytics ? analytics.daily : [],
    platform: { gPct, mPct, gSpesa, mSpesa }, markets, dailySpend,
    googleCampaigns, metaCampaigns, budget, alerts, period: p
  };
}
