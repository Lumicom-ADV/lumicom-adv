import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import KpiCard from '../components/KpiCard';
import { fmtNum } from '../services/dataService';

export default function Dashboard({ data }) {
  const [chartMode, setChartMode] = useState('daily');
  const k = data?.kpi;
  const p = data?.platform;
  const m = data?.markets;

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
      <h1>Lumicom ADV</h1>
      <p className="subtitle">{dateStr} — Panoramica Mensile</p>

      <div className="kpi-scroll">
        <KpiCard label="Spesa Mensile" value={`${fmtNum(k.spesa)}€`} current={k.spesa} previous={k.prevSpesa} />
        <KpiCard label="ROAS Medio" value={k.roas.toFixed(2)} current={k.roas} previous={k.prevRoas} />
        <KpiCard label="Conversioni" value={fmtNum(Math.round(k.conv))} current={k.conv} previous={k.prevConv} />
        <KpiCard label="CTR Medio" value={`${k.ctr.toFixed(2)}%`} current={k.ctr} previous={k.prevCtr} />
        <KpiCard label="Click Totali" value={fmtNum(k.click)} current={k.click} previous={k.prevClick} />
        <KpiCard label="CPC Medio" value={`€${k.cpc.toFixed(2)}`} current={k.cpc} previous={k.prevCpc} />
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
            <YAxis tick={{fontSize:10, fill:'#64748b'}} width={45} />
            <Tooltip contentStyle={{background:'#111827', border:'1px solid #1e293b', borderRadius:8, fontSize:12}} />
            <Line type="monotone" dataKey="spesa" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} name="Corrente" />
            <Line type="monotone" dataKey="prevSpesa" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} name="Anno prec." />
          </LineChart>
        </ResponsiveContainer>
        <div className="legend">
          <span><span className="legend-dot" style={{background:'#3b82f6'}} /> Periodo corrente</span>
          <span><span className="legend-dot" style={{background:'#f59e0b'}} /> Stesso periodo anno prec.</span>
        </div>
      </div>

      <div className="card">
        <h3>Distribuzione piattaforma</h3>
        <div className="bar-row">
          <span>Google Ads</span>
          <div className="bar-track"><div className="bar-fill google" style={{width:`${p.gPct}%`}} /></div>
          <span>{p.gPct}%</span>
        </div>
        <div className="bar-row">
          <span>Meta Ads</span>
          <div className="bar-track"><div className="bar-fill meta" style={{width:`${p.mPct}%`}} /></div>
          <span>{p.mPct}%</span>
        </div>
      </div>

      <div className="card">
        <h3>Performance per mercato</h3>
        <div className="market-grid">
          {[{flag:'🇮🇹',name:'Italia',key:'IT'},{flag:'🇫🇷',name:'Francia',key:'FR'},{flag:'🇩🇪',name:'Germania',key:'DE'}].map(({flag,name,key}) => (
            <div className="market-card" key={key}>
              <div className="market-flag">{flag}</div>
              <div className="market-name">{name}</div>
              <div className="market-spend">{fmtNum(m[key].spend)}€</div>
              <div className="market-spend-prev">anno prec: {fmtNum(m[key].spend*0.9)}€</div>
              <div className="market-roas">ROAS {mkRoas(m[key])}</div>
              <div className="market-roas-prev">anno prec: {(mkRoas(m[key])*0.93).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
