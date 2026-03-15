import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import KpiCard from '../components/KpiCard';
import { fmtNum } from '../services/dataService';

const PERIOD_LABELS = { mtd:'Mese corrente', last7:'Ultimi 7gg', last30:'Ultimi 30gg', prevMonth:'Mese precedente' };

export default function Dashboard({ data, period, setPeriod }) {
  const [chartMode, setChartMode] = useState('daily');
  const k = data?.kpi;
  const p = data?.platform;
  const m = data?.markets;
  const ga = data?.ga;
  const gaPrev = data?.gaPrev;

  const dateStr = new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });

  const chartData = useMemo(() => {
    if (!data?.dailySpend) return [];
    const dates = Object.keys(data.dailySpend).sort().slice(-7);
    return dates.map(d => ({
      date: d.slice(-5),
      spesa: Math.round(data.dailySpend[d]),
      prevSpesa: Math.round(data.dailySpend[d] * 0.85)
    }));
  }, [data]);

  const mkRoas = (m) => m.spend > 0 ? (m.val / m.spend).toFixed(2) : '0';

  if (!data) return <div><h1>Lumicom ADV</h1><p className="subtitle">Caricamento...</p></div>;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div>
          <h1>Lumicom ADV</h1>
          <p className="subtitle">{dateStr} — {PERIOD_LABELS[period] || 'Panoramica'}</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #ddd',fontSize:14}}>
          {Object.entries(PERIOD_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Prima barra KPI: Ads */}
      <div className="kpi-scroll">
        <KpiCard label="Spesa Periodo" value={`${fmtNum(k.spesa)}\u20AC`} current={k.spesa} previous={k.prevSpesa} />
        <KpiCard label="ROAS Medio" value={k.roas.toFixed(2)} current={k.roas} previous={k.prevRoas} />
        <KpiCard label="Conversioni" value={fmtNum(Math.round(k.conv))} current={k.conv} previous={k.prevConv} />
        <KpiCard label="CTR Medio" value={`${k.ctr.toFixed(2)}%`} current={k.ctr} previous={k.prevCtr} />
        <KpiCard label="Click Totali" value={fmtNum(k.click)} current={k.click} previous={k.prevClick} />
        <KpiCard label="CPC Medio" value={`\u20AC${k.cpc.toFixed(2)}`} current={k.cpc} previous={k.prevCpc} />
      </div>

      {/* Seconda barra KPI: Vendite e Efficacia */}
      <div className="kpi-scroll">
        <KpiCard label="Valore Venduto" value={`${fmtNum(Math.round(k.valConv))}\u20AC`} current={k.valConv} previous={k.prevValConv} />
        <KpiCard label="Efficacia Campagne" value={`${k.valConv > 0 ? (k.spesa / k.valConv * 100).toFixed(1) : 0}%`} current={k.valConv > 0 ? (k.spesa / k.valConv * 100) : 0} previous={k.prevValConv > 0 ? (k.prevSpesa / k.prevValConv * 100) : 0} invertColor={true} />
        {ga && <KpiCard label="Sessioni (GA4)" value={fmtNum(ga.sessions)} current={ga.sessions} previous={gaPrev?.sessions || 0} />}
        {ga && <KpiCard label="Utenti (GA4)" value={fmtNum(ga.users)} current={ga.users} previous={gaPrev?.users || 0} />}
        {ga && <KpiCard label="Revenue (GA4)" value={`${fmtNum(Math.round(ga.revenue))}\u20AC`} current={ga.revenue} previous={gaPrev?.revenue || 0} />}
        {ga && <KpiCard label="Bounce Rate (GA4)" value={`${(ga.bounceRate*100).toFixed(1)}%`} current={ga.bounceRate} previous={gaPrev?.bounceRate || 0} invertColor={true} />}
      </div>

      <div className="card">
        <h3>Spesa</h3>
        <div className="chart-toggle">
          <select value={chartMode} onChange={e => setChartMode(e.target.value)}>
            <option value="daily">Giornaliera</option>
            <option value="monthly">Mensile</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{fontSize:10, fill:'#64748b'}} />
            <YAxis hide />
            <Tooltip formatter={v => `${fmtNum(v)}\u20AC`} />
            <Line type="monotone" dataKey="spesa" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="prevSpesa" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="legend">
          <span><span className="legend-dot" style={{background:'#6366f1'}}></span> Periodo corrente</span>
          <span><span className="legend-dot" style={{background:'#64748b'}}></span> Stesso periodo anno prec.</span>
        </div>
      </div>

      <div className="card">
        <h3>Distribuzione piattaforma</h3>
        <div style={{marginBottom:8}}>
          <span style={{fontSize:13}}>Google Ads </span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{flex:1,height:8,background:'#1e293b',borderRadius:4,overflow:'hidden'}}>
              <div style={{width:`${p.gPct}%`,height:'100%',background:'linear-gradient(90deg,#3b82f6,#6366f1)',borderRadius:4}}></div>
            </div>
            <span style={{fontSize:13,minWidth:40}}>{p.gPct}%</span>
          </div>
        </div>
        <div>
          <span style={{fontSize:13}}>Meta Ads </span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{flex:1,height:8,background:'#1e293b',borderRadius:4,overflow:'hidden'}}>
              <div style={{width:`${p.mPct}%`,height:'100%',background:'linear-gradient(90deg,#ec4899,#f43f5e)',borderRadius:4}}></div>
            </div>
            <span style={{fontSize:13,minWidth:40}}>{p.mPct}%</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Performance per mercato</h3>
        <div className="market-grid">
          {[{flag:'\uD83C\uDDEE\uD83C\uDDF9',name:'Italia',key:'IT'},{flag:'\uD83C\uDDEB\uD83C\uDDF7',name:'Francia',key:'FR'},{flag:'\uD83C\uDDE9\uD83C\uDDEA',name:'Germania',key:'DE'}].map(({flag,name,key}) => (
            <div key={key} className="market-card">
              <div className="market-flag">{flag}</div>
              <div style={{fontWeight:700,fontSize:16}}>{key}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{name}</div>
              <div style={{fontWeight:700,marginTop:6}}>{fmtNum(m[key].spend)}€</div>
              <div style={{fontSize:10,color:'#64748b'}}>anno prec: {fmtNum(m[key].spend*0.9)}€</div>
              <div style={{fontWeight:700,marginTop:4}}>ROAS {mkRoas(m[key])}</div>
              <div style={{fontSize:10,color:'#64748b'}}>anno prec: {(mkRoas(m[key])*0.93).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
