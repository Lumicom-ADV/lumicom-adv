import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function Budget({ data }) {
  if (!data) return <div><h2>Budget</h2><p>Caricamento...</p></div>;
  const b = data.budget;
  const pct = b.total > 0 ? ((b.spent / b.total) * 100).toFixed(1) : 0;
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const avgDay = dayOfMonth > 0 ? (b.spent / dayOfMonth) : 0;
  const targetDay = b.total / daysInMonth;
  const projection = avgDay * daysInMonth;

  const pieData = [
    { name: 'Speso', value: b.spent },
    { name: 'Rimanente', value: Math.max(0, b.total - b.spent) }
  ];
  const COLORS = ['#3b82f6', '#1e293b'];

  const gPct = b.gBudget > 0 ? ((b.gSpent / b.gBudget) * 100).toFixed(0) : 0;
  const mPct = b.mBudget > 0 ? ((b.mSpent / b.mBudget) * 100).toFixed(0) : 0;

  return (
    <div>
      <h2>Budget</h2>
      <div className="card" style={{textAlign:'center'}}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{marginTop:-90, position:'relative', zIndex:1}}>
          <div className="budget-pct">{pct}%</div>
          <div className="budget-label">utilizzato</div>
        </div>
        <div style={{marginTop:20, fontSize:14}}>
          <span style={{fontWeight:700}}>{Math.round(b.spent).toLocaleString('it-IT')} \u20ac</span>
          <span style={{color:'#64748b'}}> di </span>
          <span style={{fontWeight:700}}>{Math.round(b.total).toLocaleString('it-IT')} \u20ac</span>
        </div>
        <div className="budget-label">Budget mensile</div>
      </div>

      <div className="card">
        <h3>Allocazione budget</h3>
        <div className="alloc-item">
          <span style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',display:'inline-block'}} />
            Google Ads
          </span>
          <span>{Math.round(b.gSpent).toLocaleString('it-IT')} \u20ac / {Math.round(b.gBudget).toLocaleString('it-IT')} \u20ac <span style={{color: gPct > 100 ? '#ef4444' : '#10b981', fontSize:11}}>({gPct}%)</span></span>
        </div>
        <div className="alloc-item">
          <span style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#ec4899)',display:'inline-block'}} />
            Meta Ads
          </span>
          <span>{Math.round(b.mSpent).toLocaleString('it-IT')} \u20ac / {Math.round(b.mBudget).toLocaleString('it-IT')} \u20ac <span style={{color: mPct > 100 ? '#ef4444' : '#10b981', fontSize:11}}>({mPct}%)</span></span>
        </div>
      </div>

      <div className="card">
        <h3>Pacing</h3>
        <div className="pacing-grid">
          <div className="pacing-item">
            <div className="pacing-value">{Math.round(avgDay)}\u20ac</div>
            <div className="pacing-label">Media giornaliera</div>
          </div>
          <div className="pacing-item">
            <div className="pacing-value">{Math.round(targetDay)}\u20ac</div>
            <div className="pacing-label">Target giornaliero</div>
          </div>
          <div className="pacing-item" style={{gridColumn:'span 2'}}>
            <div className="pacing-value" style={{color: projection > b.total * 1.1 ? '#ef4444' : projection < b.total * 0.9 ? '#f59e0b' : '#10b981'}}>
              {Math.round(projection).toLocaleString('it-IT')}\u20ac
            </div>
            <div className="pacing-label">Proiezione fine mese</div>
          </div>
        </div>
      </div>
    </div>
  );
}
