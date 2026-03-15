import React from 'react';
import { fmtPct } from '../services/dataService';

export default function KpiCard({ label, value, current, previous, suffix = '' }) {
  const change = fmtPct(current, previous);
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {change.text && (
        <div className={`kpi-change ${change.cls}`}>{change.text}</div>
      )}
      <div className="kpi-sub">vs stesso mese anno prec.</div>
    </div>
  );
}
