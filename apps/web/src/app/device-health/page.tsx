'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { Smartphone, CheckCircle2, AlertTriangle, BatteryCharging, RefreshCw, FolderCheck, HardDrive, Clock, Search, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function DeviceHealthPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/devices', {
        headers: {
          Authorization: 'Bearer mock_jwt_token',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const apiDevices = data.devices || data || [];
        setDevices(Array.isArray(apiDevices) ? apiDevices : []);
      }
    } catch (err) {
      console.error('Error fetching live devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchDevices();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getDeviceInactivityInfo = (lastSyncVal: any) => {
    if (!lastSyncVal) return { isInactive: true, text: 'Never synced', color: 'text-red-400', level: 'RED' };
    const dateMs = new Date(lastSyncVal).getTime();
    if (isNaN(dateMs)) return { isInactive: true, text: 'Unknown', color: 'text-slate-400', level: 'GRAY' };

    const diffMin = Math.floor((Date.now() - dateMs) / (1000 * 60));
    if (diffMin < 20) {
      return { isInactive: false, text: diffMin <= 1 ? 'Just now' : `${diffMin}m ago`, color: 'text-emerald-400', level: 'GREEN' };
    }
    if (diffMin < 120) {
      return { isInactive: false, text: `${diffMin}m ago`, color: 'text-amber-400', level: 'YELLOW' };
    }
    const diffHours = Math.floor(diffMin / 60);
    return { isInactive: true, text: `${diffHours}h ${diffMin % 60}m ago (Delayed)`, color: 'text-rose-400', level: 'RED' };
  };

  const totalDevices = devices.length;
  const inactiveCount = devices.filter((d) => getDeviceInactivityInfo(d.lastSyncTimestamp || d.lastSync).isInactive).length;
  const healthyDevices = devices.filter((d) => !getDeviceInactivityInfo(d.lastSyncTimestamp || d.lastSync).isInactive).length;
  const safCount = devices.filter((d) => d.safDirectoryAuthorized !== false && d.safAuthorized !== false).length;
  const safPercentage = totalDevices > 0 ? Math.round((safCount / totalDevices) * 100) : 0;
  const warningsCount = devices.filter((d) => d.batteryOptimizationDisabled === false || d.status === 'WARNING').length;

  const filteredDevices = useMemo(() => {
    return devices.filter((dev) => {
      const name = (dev.agentName || dev.counselorEmail || '').toLowerCase();
      const model = (dev.deviceModel || dev.deviceId || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || model.includes(query);
    });
  }, [devices, searchQuery]);

  return (
    <div className="flex min-h-screen bg-navy-950 text-slate-100 font-sans">
      <Navigation />

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Device Health & Inactivity Diagnostics</h1>
            <p className="text-sm text-slate-400">Monitor counselors&apos; mobile devices, sync latency, and background battery optimization</p>
          </div>

          <button
            onClick={fetchDevices}
            className="flex items-center space-x-1.5 self-start sm:self-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {/* Diagnostics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-panel p-5 space-y-2 border border-slate-800 rounded-2xl bg-slate-900/60">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Mobile Fleet</span>
              <Smartphone className="w-4 h-4 text-brand-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalDevices} Devices</p>
            <p className="text-xs text-slate-400">Registered Counselor Phones</p>
          </div>

          <div className="glass-panel p-5 space-y-2 border border-slate-800 rounded-2xl bg-slate-900/60">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Active & Syncing</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400">{healthyDevices} / {totalDevices}</p>
            <p className="text-xs text-emerald-400/80 font-medium">Synced within last 2 hours</p>
          </div>

          <div className="glass-panel p-5 space-y-2 border border-slate-800 rounded-2xl bg-slate-900/60">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Inactivity Alert (&gt; 2h)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-3xl font-bold text-rose-400">{inactiveCount} Inactive</p>
            <p className="text-xs text-rose-400/80">Phones with delayed syncs</p>
          </div>

          <div className="glass-panel p-5 space-y-2 border border-slate-800 rounded-2xl bg-slate-900/60">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">SAF Call Folder Granted</span>
              <FolderCheck className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-3xl font-bold text-teal-400">{safPercentage}%</p>
            <p className="text-xs text-slate-400">Call folder authorization</p>
          </div>
        </div>

        {/* Devices Diagnostic Table */}
        <div className="glass-panel overflow-hidden p-6 space-y-4 border border-slate-800 rounded-2xl bg-slate-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-bold text-white">Counselor Android Device Fleet</h3>

            {/* Search Box */}
            <div className="relative w-full max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search counselor or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Counselor</th>
                  <th className="p-4">Device Model</th>
                  <th className="p-4">Android OS</th>
                  <th className="p-4">App Version</th>
                  <th className="p-4">Battery Saver Status</th>
                  <th className="p-4">SAF Call Folder</th>
                  <th className="p-4">Last Sync / Activity</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      {loading ? 'Loading devices...' : 'No connected Android devices matching search.'}
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((dev) => {
                    const syncInfo = getDeviceInactivityInfo(dev.lastSyncTimestamp || dev.lastSync);
                    const isSafOk = dev.safDirectoryAuthorized !== false && dev.safAuthorized !== false;

                    return (
                      <tr key={dev.id || dev._id || dev.deviceId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-semibold text-white">
                          <div>
                            <p>{dev.agentName || dev.counselorEmail || 'Counselor Agent'}</p>
                            {dev.counselorEmail && <p className="text-[10px] text-slate-500 font-mono">{dev.counselorEmail}</p>}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-slate-200">{dev.deviceModel || dev.deviceId || 'Android Phone'}</td>
                        <td className="p-4 text-slate-400">{dev.androidVersion || 'Android 14'}</td>
                        <td className="p-4 font-mono text-slate-300">{dev.appVersion || 'v1.0.4'}</td>
                        <td className="p-4">
                          {dev.batteryOptimizationDisabled !== false ? (
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                              Unrestricted (Good)
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded text-[10px]">
                              Optimized (Warning)
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {isSafOk ? (
                            <span className="text-teal-400 font-semibold text-[11px]">Authorized</span>
                          ) : (
                            <span className="text-rose-400 font-semibold text-[11px]">Not Authorized</span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-medium">
                          <span className={syncInfo.color}>{syncInfo.text}</span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                              syncInfo.level === 'GREEN'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : syncInfo.level === 'YELLOW'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {syncInfo.level === 'GREEN' ? 'HEALTHY' : syncInfo.level === 'YELLOW' ? 'SYNC DELAY' : 'INACTIVE (>2h)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
