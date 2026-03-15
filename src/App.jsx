import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import LiveIndicator from './components/LiveIndicator';
import Dashboard from './pages/Dashboard';
import Campagne from './pages/Campagne';
import Budget from './pages/Budget';
import Alert from './pages/Alert';
import Settings from './pages/Settings';
import { startPolling, stopPolling, subscribe, processData } from './services/dataService';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [alertDetail, setAlertDetail] = useState(null);

  useEffect(() => {
    const unsub = subscribe((rawData, live) => {
      setData(processData(rawData));
      setIsLive(live);
    });
    startPolling();
    return () => { unsub(); stopPolling(); };
  }, []);

  const renderPage = () => {
    switch(page) {
      case 'dashboard': return <Dashboard data={data} />;
      case 'campagne': return <Campagne data={data} />;
      case 'budget': return <Budget data={data} />;
      case 'alert': return <Alert data={data} detail={alertDetail} setDetail={setAlertDetail} />;
      case 'settings': return <Settings />;
      default: return <Dashboard data={data} />;
    }
  };

  return (
    <>
      <LiveIndicator isLive={isLive} />
      <Layout page={page} setPage={setPage}>
        {renderPage()}
      </Layout>
    </>
  );
}
