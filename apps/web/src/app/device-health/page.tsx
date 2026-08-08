'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Smartphone, CheckCircle2, AlertTriangle, BatteryCharging, RefreshCw, FolderCheck, HardDrive } from 'lucide-react';

export default function DeviceHealthPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/v1/devices', {
        headers: {
          Authorization: 'Bearer mock_jwt_token',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const apiDevices = data.devices || data || [];
        setDevices(apiDevices);
      }
    } catch (err) {
      console.error('Error fetching live devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalDevices = devices.length;
  const healthyDevices = devices.filter((d) => d.status === 'HEALTHY' || d.status === 'ACTIVE').length;
  const safCount = devices.filter((d) => d.safAuthorized).length;
  const safPercentage = totalDevices > 0 ? Math.round((safCount / totalDevices) * 100) : 0;
  const warningsCount = devices.filter((d) => d.batteryOptimizationDisabled === false || d.status === 'WARNING').length;

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Navigation />

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Device Health & Sync Diagnostics</h1>
          <p className="text-sm text-slate-400">Monitor counselors&apos; Android devices, background battery optimizations, and SAF folder permissions</p>
        </div>

        {/* Diagnostics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Mobile Fleet</span>
              <Smartphone className="w-4 h-4 text-brand-400" />
            </div>
            <p className="text-3xl font-bold text-white">{totalDevices} Devices</p>
            <p className="text-xs text-slate-400">Live Active Fleet</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Healthy Status</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">{healthyDevices} / {totalDevices}</p>
            <p className="text-xs text-emerald-400 font-medium">Sync Engine Active</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">SAF Directory Granted</span>
              <FolderCheck className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-3xl font-bold text-white">{safPercentage}%</p>
            <p className="text-xs text-slate-400">OEM Call Folders Bound</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Optimization Alert</span>
              <BatteryCharging className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-amber-400">{warningsCount} Warnings</p>
            <p className="text-xs text-slate-400">Battery whitelist alerts</p>
          </div>
        </div>

        {/* Devices Diagnostic Table */}
        <div className="glass-panel overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Counselor Android Device Matrix</h3>
            <button
              onClick={fetchDevices}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 px-3 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Health Telemetry</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Counselor</th>
                  <th className="p-4">Device Model</th>
                  <th className="p-4">Android OS</th>
                  <th className="p-4">App Version</th>
                  <th className="p-4">Battery Optimization</th>
                  <th className="p-4">SAF Folder</th>
                  <th className="p-4">Last Sync</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No connected Android devices registered in MongoDB database yet. Sign in on the RecordHub Android app to register your device!
                    </td>
                  </tr>
                ) : (
                  devices.map((dev) => (
                    <tr key={dev.id || dev._id || dev.deviceId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">{dev.agentName || dev.counselorEmail || 'Counselor Agent'}</td>
                      <td className="p-4 font-medium text-slate-200">{dev.deviceModel || dev.deviceId || 'Xiaomi Phone'}</td>
                      <td className="p-4 text-slate-400">{dev.androidVersion || 'Android 14'}</td>
                      <td className="p-4 font-mono">{dev.appVersion || 'v1.0.4'}</td>
                      <td className="p-4">
                        {dev.batteryOptimizationDisabled ? (
                          <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Disabled (Good)</span>
                        ) : (
                          <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">Enabled (Warning)</span>
                        )}
                      </td>
                      <td className="p-4">
                        {dev.safAuthorized ? (
                          <span className="text-teal-400 font-semibold">Authorized</span>
                        ) : (
                          <span className="text-red-400 font-semibold">Missing</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-400">{dev.lastSync ? new Date(dev.lastSync).toLocaleTimeString() : 'Just now'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            dev.status === 'HEALTHY' || dev.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {dev.status || 'HEALTHY'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
