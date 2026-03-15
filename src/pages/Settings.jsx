import React, { useState } from 'react';
import { getApiUrl, setApiUrl, fetchData } from '../services/dataService';

export default function Settings() {
  const [url, setUrl] = useState(getApiUrl());
  const [status, setStatus] = useState('');
  const [statusColor, setStatusColor] = useState('#94a3b8');

  const handleSave = async () => {
    setApiUrl(url);
    setStatus('Salvato! Connessione...');
    setStatusColor('#60a5fa');
    try {
      await fetchData(url);
      setStatus('Connesso! Dati aggiornati.');
      setStatusColor('#10b981');
    } catch (e) {
      setStatus('Errore: ' + e.message);
      setStatusColor('#ef4444');
    }
  };

  const handleTest = async () => {
    setStatus('Test in corso...');
    setStatusColor('#60a5fa');
    try {
      const res = await fetch(url);
      const data = JSON.parse(await res.text());
      const keys = Object.keys(data).filter(k => k !== 'timestamp' && k !== 'status');
      setStatus('OK! Fogli trovati: ' + keys.join(', '));
      setStatusColor('#10b981');
    } catch (e) {
      setStatus('Errore: ' + e.message);
      setStatusColor('#ef4444');
    }
  };

  return (
    <div>
      <h2>Impostazioni</h2>
      <div className="settings-section">
        <h3>Connessione Dati Live</h3>
        <label style={{fontSize:12,color:'#94a3b8',marginBottom:4,display:'block'}}>URL API Google Apps Script</label>
        <input
          className="settings-input"
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/.../exec"
        />
        <button className="btn btn-primary" onClick={handleSave}>Salva e Connetti</button>
        <button className="btn btn-secondary" onClick={handleTest}>Test</button>
        <div className="status-msg" style={{color: statusColor}}>{status}</div>
      </div>
      <div className="settings-section">
        <h3>Informazioni</h3>
        <p style={{fontSize:13,color:'#94a3b8'}}>Lumicom ADV Dashboard v3.0</p>
        <p style={{fontSize:12,color:'#64748b',marginTop:8}}>Dati aggiornati in tempo reale dal Google Sheet sorgente tramite Apps Script API.</p>
        <p style={{fontSize:11,color:'#64748b',marginTop:4}}>Prossimo refresh: ogni 5 minuti</p>
      </div>
    </div>
  );
}
