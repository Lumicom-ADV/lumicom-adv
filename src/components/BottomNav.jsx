import React from 'react';
import { LayoutDashboard, Megaphone, Wallet, AlertTriangle, Settings } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'campagne', label: 'Campagne', Icon: Megaphone },
  { id: 'budget', label: 'Budget', Icon: Wallet },
  { id: 'alert', label: 'Alert', Icon: AlertTriangle },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function BottomNav({ page, setPage }) {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ id, label, Icon }) => (
        <a
          key={id}
          className={`nav-item ${page === id ? 'active' : ''}`}
          onClick={() => { setPage(id); window.scrollTo(0, 0); }}
        >
          <Icon size={20} />
          {label}
        </a>
      ))}
    </nav>
  );
}
