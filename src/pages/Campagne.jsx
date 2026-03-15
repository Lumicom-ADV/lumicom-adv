import React, { useState } from 'react';
import { fmtNum, fmtPct } from '../services/dataService';

const PERIOD_LABELS = { mtd:'Mese corrente', last7:'Ultimi 7gg', last30:'Ultimi 30gg', prevMonth:'Mese precedente' };

function CampCard({ c }) {
  const roasColor = c.roas >= 3 ? 'green' : c.roas >= 1.5 ? 'yellow' : 'red';
  const prev = c.prev;
  const spesaPct = prev ? fmtPct(c.spend, prev.spend) : null;
  const roasPct = prev ? fmtPct(c.roas, prev.roas) : null;
  const convPct = prev ? fmtPct(c.conv, prev.conv) : null;
  return (
    <div className="camp-card">
      <div className="camp-name">{c.name}</div>
      <span className="camp-type">{c.type}</span>
      {c.market && <span className="camp-type">{c.market}</span>}
      <div className="camp-stats">
        <div><div className="camp-stat-label">ROAS</div><div className="camp-stat-value">{c.roas > 0 ? c.roas.toFixed(2) : '\u2014'}{roasPct && roasPct.text && <small className={roasPct.cls}> {roasPct.text}</small>}</div></div>
        <div><div className="camp-stat-label">Spesa</div><div className="camp-stat-value">{fmtNum(c.spend)}\u20AC{spesaPct && spesaPct.text && <small className={spesaPct.cls}> {spesaPct.text}</small>}</div></div>
        <div><div className="camp-stat-label">CTR</div><div className="camp-stat-value">{c.ctr.toFixed(2)}%</div></div>
        <div><div className="camp-stat-label">CPC</div><div className="camp-stat-value">\u20AC{c.cpc.toFixed(2)}</div></div>
        <div><div className="camp-stat-label">Conv.</div><div className="camp-stat-value">{fmtNum(Math.round(c.conv))}{convPct && convPct.text && <small className={convPct.cls}> {convPct.text}</small>}</div></div>
      </div>
      <div className={`camp-kpi ${roasColor}`}>
        ROAS {c.roas.toFixed(2)} {roasColor === 'green' ? '\u2191' : roasColor === 'red' ? '\u2193' : '\u2194'}
        {prev && <span style={{marginLeft:8,fontSize:11,opacity:0.7}}>vs {prev.roas.toFixed(2)} anno prec.</span>}
      </div>
    </div>
  );
}

export default function Campagne({ data, period, setPeriod }) {
  const [tab, setTab] = useState('google');
  if (!data) return <div><h2>Campagne</h2><p>Caricamento...</p></div>;

  const campaigns = tab === 'google' ? data.googleCampaigns : data.metaCampaigns;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12}}>
        <h2>Campagne</h2>
        {setPeriod && <select value={period} onChange={e => setPeriod(e.target.value)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #ddd',fontSize:14}}>
          {Object.entries(PERIOD_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>}
      </div>
      <p style={{fontSize:12,color:'#64748b',marginTop:-8,marginBottom:12}}>{data.kpi?.periodLabel || ''}</p>
      <div className="tabs">
        <button className={tab === 'google' ? 'active' : ''} onClick={() => setTab('google')}>Google Ads</button>
        <button className={tab === 'meta' ? 'active' : ''} onClick={() => setTab('meta')}>Meta Ads</button>
      </div>
      {campaigns.map((c, i) => <CampCard key={i} c={c} />)}
      {campaigns.length === 0 && <p style={{color:'#64748b',textAlign:'center',padding:20}}>Nessuna campagna attiva nel periodo</p>}
    </div>
  );
}
