import React from 'react';
import { ArrowLeft } from 'lucide-react';

function AlertDetail({ alert, onBack }) {
  const suggestions = [
    { title: 'Ottimizzazione offerte', desc: 'Valuta di aumentare il bid per le keyword con alto tasso di conversione e ridurre quelle con basso CTR.' },
    { title: 'Revisione targeting', desc: 'Controlla i segmenti di pubblico e verifica che le esclusioni siano aggiornate per evitare spreco di budget.' },
    { title: 'Test creativi', desc: 'Lancia nuove varianti di annunci con copy diversi. Un refresh delle creativita` puo` migliorare il CTR del 15-25%.' },
    { title: 'Landing page', desc: 'Verifica la velocita` di caricamento e il tasso di bounce. Una landing ottimizzata puo` aumentare le conversioni del 20%.' }
  ];
  return (
    <div className="alert-detail">
      <a onClick={onBack} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:8,color:'#60a5fa',marginBottom:16,fontSize:14}}>
        <ArrowLeft size={16} /> Torna agli alert
      </a>
      <h2>{alert.title}</h2>
      <p style={{color:'#94a3b8',fontSize:13,marginBottom:16}}>{alert.campaign} - {alert.platform} - {alert.date}</p>
      <div className={`alert-badge ${alert.severity}`}>{alert.severity === 'high' ? 'Alta' : 'Media'} priorita`</div>
      <div style={{marginTop:16}}>
        <div className="alert-action">{alert.action}</div>
      </div>
      <h3 style={{marginTop:24,marginBottom:12}}>Suggerimenti</h3>
      {suggestions.map((s, i) => (
        <div className="suggestion-card" key={i}>
          <h4>{s.title}</h4>
          <p>{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

export default function Alert({ data, detail, setDetail }) {
  if (detail) return <AlertDetail alert={detail} onBack={() => setDetail(null)} />;
  if (!data) return <div><h2>Alert</h2><p>Caricamento...</p></div>;

  const alerts = data.alerts || [];

  return (
    <div>
      <h2>Alert <span style={{fontSize:13,color:'#94a3b8',fontWeight:400}}>{alerts.length} attivi</span></h2>
      {alerts.slice(0, 10).map((a, i) => (
        <div
          key={i}
          className={`alert-card ${a.severity}`}
          onClick={() => setDetail(a)}
        >
          <span className={`alert-badge ${a.severity}`}>{a.severity === 'high' ? 'Alta' : 'Media'}</span>
          <div className="alert-title">{a.title}</div>
          <div style={{fontSize:12,color:'#94a3b8'}}>{a.campaign} &middot; {a.platform} &middot; {a.date}</div>
          <div className="alert-action">{a.action}</div>
        </div>
      ))}
      {alerts.length === 0 && <p style={{color:'#64748b',textAlign:'center',padding:40}}>Nessun alert attivo</p>}
    </div>
  );
}
