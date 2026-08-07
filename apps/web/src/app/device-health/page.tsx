'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import { Smartphone, CheckCircle2, AlertTriangle, BatteryCharging, RefreshCw, FolderCheck, HardDrive } from 'lucide-react';

const mockDevices = [
  {
    id: '1',
    agentName: 'Ananya Sharma',
    deviceModel: 'Samsung Galaxy A54 5G',
    androidVersion: 'Android 14 (One UI 6.1)',
    appVersion: 'v1.0.4-prod',
    batteryOptimizationDisabled: true,
    safAuthorized: true,
    lastSync: '2 mins ago',
    failedUploads: 0,
    pendingSync: 1,
    status: 'HEALTHY',
  },
  {
    id: '2',
    agentName: 'Rahul Verma',
    deviceModel: 'Xiaomi Redmi Note 13 Pro',
    androidVersion: 'Android 13 (MIUI 14)',
    appVersion: 'v1.0.4-prod',
    batteryOptimizationDisabled: true,
    safAuthorized: true,
    lastSync: '14 mins ago',
    failedUploads: 1,
    pendingSync: 2,
    status: 'HEALTHY',
  },
  {
    id: '3',
    agentName: 'Priya Nair',
    deviceModel: 'OnePlus Nord 3 5G',
    androidVersion: 'Android 14 (OxygenOS 14)',
    appVersion: 'v1.0.4-prod',
    batteryOptimizationDisabled: false,
    safAuthorized: true,
    lastSync: '5 hours ago',
    failedUploads: 0,
    pendingSync: 8,
    status: 'WARNING',
  },
];

export default function DeviceHealthPage() {
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
            <p className="text-3xl font-bold text-white">3 Devices</p>
            <p className="text-xs text-slate-400">100% Android 13/14 Fleet</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Healthy Status</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white">2 / 3</p>
            <p className="text-xs text-emerald-400 font-medium">Sync Engine Active</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">SAF Directory Granted</span>
              <FolderCheck className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-3xl font-bold text-white">100%</p>
            <p className="text-xs text-slate-400">OEM Call Folders Bound</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Optimization Alert</span>
              <BatteryCharging className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-amber-400">1 Warning</p>
            <p className="text-xs text-slate-400">Priya Nair needs battery whitelist</p>
          </div>
        </div>

        {/* Devices Diagnostic Table */}
        <div className="glass-panel overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Counselor Android Device Matrix</h3>
            <button className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 px-3 py-1.5 rounded-lg transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
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
                {mockDevices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-semibold text-white">{dev.agentName}</td>
                    <td className="p-4 font-medium text-slate-200">{dev.deviceModel}</td>
                    <td className="p-4 text-slate-400">{dev.androidVersion}</td>
                    <td className="p-4 font-mono">{dev.appVersion}</td>
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
                    <td className="p-4 font-mono text-slate-400">{dev.lastSync}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          dev.status === 'HEALTHY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {dev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
