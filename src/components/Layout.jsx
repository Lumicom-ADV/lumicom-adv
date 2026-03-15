import React from 'react';
import BottomNav from './BottomNav';

export default function Layout({ page, setPage, children }) {
  return (
    <>
      <div className="app">
        {children}
      </div>
      <BottomNav page={page} setPage={setPage} />
    </>
  );
}
