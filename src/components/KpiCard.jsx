import React from 'react';
import { fmtPct } from '../services/dataService';

export default function KpiCard({ label, value, current, previous, suffix = '', invertColor = false }) {
  const change = fmtPct(current, previous);
  const cls = invertColor
    ? (change.cls === 'up' ? 'down' : change.cls === 'down' ? 'up' : change.cls)
    : change.cls;
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {change.text && (
        <div className={`kpi-change ${cls}`}>{change.text}</div>
      )}
      <div className="kpi-sub">vs stesso periodo anno prec.</div>
    </div>
  );
}
