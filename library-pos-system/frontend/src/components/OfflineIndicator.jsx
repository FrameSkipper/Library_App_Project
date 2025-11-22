import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showNotification && isOnline) return null;

  return (
    <div
      className={`fixed top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg z-50 ${
        isOnline
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
      <span className="font-medium">
        {isOnline ? 'Back Online' : 'You are offline'}
      </span>
    </div>
  );
}

export default OfflineIndicator;