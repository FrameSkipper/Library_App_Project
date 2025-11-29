// frontend/src/components/SyncStatus.jsx
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import offlineAPI from '../services/offlineApi';

function SyncStatus() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingOperations: 0,
    lastSync: null,
    hasPendingChanges: false,
  });

  useEffect(() => {
    // Initialize
    loadStatus();

    // Update status every 5 seconds
    const interval = setInterval(loadStatus, 5000);

    // Listen for online/offline events
    const handleOnline = () => loadStatus();
    const handleOffline = () => loadStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync completion
    offlineAPI.onSyncComplete(() => {
      loadStatus();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const syncStatus = await offlineAPI.getSyncStatus();
      setStatus(syncStatus);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleManualSync = async () => {
    if (!status.isOnline || status.isSyncing) return;

    setStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      await offlineAPI.sync();
      await loadStatus();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`
        bg-white rounded-lg shadow-lg border-2 px-4 py-2 flex items-center gap-3 transition-all
        ${status.isOnline ? 'border-green-500' : 'border-orange-500'}
      `}>
        {/* Online/Offline Indicator */}
        <div className="flex items-center gap-2">
          {status.isOnline ? (
            <>
              <Wifi size={20} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">Online</span>
            </>
          ) : (
            <>
              <WifiOff size={20} className="text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Offline</span>
            </>
          )}
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* Sync Status */}
        {status.isSyncing ? (
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-blue-600 animate-spin" />
            <span className="text-sm text-gray-700">Syncing...</span>
          </div>
        ) : status.hasPendingChanges ? (
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-600" />
            <span className="text-sm text-gray-700">
              {status.pendingOperations} pending
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm text-gray-700">Synced</span>
          </div>
        )}

        {/* Last Sync Time */}
        {status.lastSync && (
          <>
            <div className="h-6 w-px bg-gray-300"></div>
            <span className="text-xs text-gray-500">
              {formatLastSync(status.lastSync)}
            </span>
          </>
        )}

        {/* Manual Sync Button */}
        {status.isOnline && !status.isSyncing && (
          <>
            <div className="h-6 w-px bg-gray-300"></div>
            <button
              onClick={handleManualSync}
              className="p-1 hover:bg-gray-100 rounded transition"
              title="Manual sync"
            >
              <RefreshCw size={16} className="text-gray-600" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default SyncStatus;