import React from 'react';

export default function LiveIndicator({ isLive }) {
  return (
    <div className={`live-indicator ${isLive ? 'online' : 'offline'}`}>
      <span className="live-dot" />
      {isLive ? 'LIVE' : 'OFFLINE'}
    </div>
  );
}
