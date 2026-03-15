import React, { useState } from 'react';
import { fmtNum } from '../services/dataService';

function CampCard({ c }) {
  const roasColor = c.roas >= 3 ? 'green' : c.roas >= 1.5 ? 'yellow' : 'red';
  return (
    <div className="camp-card">
      <div className="camp-name">{c.name}</div>
      <span className="camp-type">{c.type}</span>
      {c.market && <span className="camp-type">{c.market}</span>}
      <div className="camp-stats">
        <div><div className="camp-stat-label">ROAS</div><div className="camp-stat-value">{c.roas > 0 ? c.roas.toFixed(2) : '\u2014'}</div></div>
        <div><div className="camp-stat-label">Spesa</div><div className="camp-stat-value">{fmtNum(c.spend)}\u20ac</div></div>
        <div><div className="camp-stat-label">CTR</div><div className="camp-stat-value">{c.ctr.toFixed(2)}%</div></div>
        <div><div className="camp-stat-label">CPC</div><div className="camp-stat-value">\u20ac{c.cpc.toFixed(2)}</div></div>
        <div><div className="camp-stat-label">Conv.</div><div className="camp-stat-value">{fmtNum(Math.round(c.conv))}</div></div>
      </div>
      <div className={`camp-kpi ${roasColor}`}>
        ROAS {c.roas.toFixed(2)} {roasColor === 'green' ? '\u2191' : roasColor === 'red' ? '\u2193' : '\u2194'}
      </div>
    </div>
  );
}

export default function Campagne({ data }) {
  const [tab, setTab] = useState('google');
  if (!data) return <div><h2>Campagne</h2><p>Caricamento...</p></div>;

  const campaigns = tab === 'google' ? data.googleCampaigns : data.metaCampaigns;

  return (
    <div>
      <h2>Campagne</h2>
      <div className="tabs">
        <button className={tab === 'google' ? 'active' : ''} onClick={() => setTab('google')}>Google Ads</button>
        <button className={tab === 'meta' ? 'active' : ''} onClick={() => setTab('meta')}>Meta Ads</button>
      </div>
      {campaigns.map((c, i) => <CampCard key={i} c={c} />)}
      {campaigns.length === 0 && <p style={{color:'#64748b',textAlign:'center',padding:20}}>Nessuna campagna attiva</p>}
    </div>
  );
}
