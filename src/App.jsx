import React, { useState, useEffect, useRef } from 'react';
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
  const [period, setPeriod] = useState('mtd');
  const rawRef = useRef(null);

  useEffect(() => {
    const unsub = subscribe((rawData, live) => {
      rawRef.current = rawData;
      setData(processData(rawData, period));
      setIsLive(live);
    });
    startPolling();
    return () => { unsub(); stopPolling(); };
  }, []);

  useEffect(() => {
    if (rawRef.current) setData(processData(rawRef.current, period));
  }, [period]);

  const renderPage = () => {
    switch(page) {
      case 'dashboard': return <Dashboard data={data} period={period} setPeriod={setPeriod} />;
            case 'campagne': return <Campagne data={data} period={period} setPeriod={setPeriod} />;
      case 'budget': return <Budget data={data} />;
      case 'alert': return <Alert data={data} detail={alertDetail} setDetail={setAlertDetail} />;
      case 'settings': return <Settings />;
      default: return <Dashboard data={data} period={period} setPeriod={setPeriod} />;
    }
  };

  return (
    <Layout page={page} setPage={setPage} alerts={data?.alerts} setAlertDetail={setAlertDetail}>
      <LiveIndicator live={isLive} />
      {renderPage()}
    </Layout>
  );
}
