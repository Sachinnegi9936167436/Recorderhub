'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, Mic, Users, TrendingUp, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockTimeSeriesData = [
  { date: 'Aug 01', callVolume: 54, talkTimeMinutes: 210 },
  { date: 'Aug 02', callVolume: 68, talkTimeMinutes: 280 },
  { date: 'Aug 03', callVolume: 42, talkTimeMinutes: 165 },
  { date: 'Aug 04', callVolume: 79, talkTimeMinutes: 340 },
  { date: 'Aug 05', callVolume: 85, talkTimeMinutes: 390 },
  { date: 'Aug 06', callVolume: 92, talkTimeMinutes: 425 },
  { date: 'Aug 07', callVolume: 64, talkTimeMinutes: 295 },
];

const mockLeaderboard = [
  { rank: 1, name: 'Ananya Sharma', totalCalls: 48, connected: 42, talkTime: '4h 12m', recordings: 42, score: 92 },
  { rank: 2, name: 'Rahul Verma', totalCalls: 42, connected: 36, talkTime: '3h 45m', recordings: 36, score: 86 },
  { rank: 3, name: 'Priya Nair', totalCalls: 38, connected: 31, talkTime: '3h 10m', recordings: 30, score: 84 },
  { rank: 4, name: 'Karan Patel', totalCalls: 35, connected: 28, talkTime: '2h 50m', recordings: 28, score: 79 },
];

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('Last 7 Days');

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Navigation />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Top Header & Range Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Executive Call Intelligence</h1>
            <p className="text-sm text-slate-400">Academically Global Healthcare Academy • NCLEX & DHA Licensing Teams</p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-lg text-xs font-medium text-slate-300">
            {['Today', 'Yesterday', 'Last 7 Days', 'This Month'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  dateRange === range ? 'bg-brand-600 text-white shadow' : 'hover:text-white hover:bg-slate-800'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Executive KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Calls</span>
              <PhoneCall className="w-4 h-4 text-brand-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">484</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" /> +14%
              </span>
            </div>
            <p className="text-xs text-slate-400">298 Outgoing • 186 Incoming</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Connection Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">84.2%</span>
              <span className="text-xs text-emerald-400 font-medium">+3.5% vs avg</span>
            </div>
            <p className="text-xs text-slate-400">407 Answered • 77 Unanswered</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Talk Time</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">35h 05m</span>
              <span className="text-xs text-slate-400">Avg 5m 10s / call</span>
            </div>
            <p className="text-xs text-slate-400">Top counselor: 4h 12m</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Recording Coverage</span>
              <Mic className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">98.1%</span>
              <span className="text-xs text-emerald-400 font-medium">SAF Active</span>
            </div>
            <p className="text-xs text-slate-400">400 Audio files ingested to S3</p>
          </div>
        </div>

        {/* Chart + Live Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Call Volume & Talk Time Trend */}
          <div className="lg:col-span-2 glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Call Volume & Talk Time Trend</h3>
                <p className="text-xs text-slate-400">Daily breakdown for Academically Global Counselors</p>
              </div>
              <span className="text-xs font-medium text-brand-400 bg-brand-600/10 px-2.5 py-1 rounded border border-brand-500/20">
                Live Data
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockTimeSeriesData}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="callVolume" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" name="Calls" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Live Activity Feed</h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex space-x-3 text-xs">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <PhoneOutgoing className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium">Ananya Sharma called <span className="text-white font-semibold">Dr. Rajesh Kumar</span></p>
                  <p className="text-slate-400 text-[11px]">Enrolled in NCLEX-RN • 6m 24s audio synced</p>
                  <span className="text-[10px] text-slate-500">2 mins ago</span>
                </div>
              </div>

              <div className="flex space-x-3 text-xs">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <PhoneIncoming className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium">Nurse Sunita Patel called <span className="text-white font-semibold">Ananya Sharma</span></p>
                  <p className="text-slate-400 text-[11px]">DHA Dubai Document Verification • 4m 05s</p>
                  <span className="text-[10px] text-slate-500">14 mins ago</span>
                </div>
              </div>

              <div className="flex space-x-3 text-xs">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-200 font-medium">Rahul Verma updated disposition</p>
                  <p className="text-slate-400 text-[11px]">Fee Installment Discussion • QA Score 78/100</p>
                  <span className="text-[10px] text-slate-500">32 mins ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Leaderboard Table */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Counselor Performance Leaderboard</h3>
              <p className="text-xs text-slate-400">Team activity, connection rates, and conversation QA quality scores</p>
            </div>
            <Users className="w-5 h-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Counselor Name</th>
                  <th className="p-3">Total Calls</th>
                  <th className="p-3">Connected</th>
                  <th className="p-3">Total Talk Time</th>
                  <th className="p-3">S3 Recordings</th>
                  <th className="p-3">QA Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mockLeaderboard.map((agent) => (
                  <tr key={agent.rank} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-brand-400">#{agent.rank}</td>
                    <td className="p-3 font-medium text-white">{agent.name}</td>
                    <td className="p-3">{agent.totalCalls}</td>
                    <td className="p-3 text-emerald-400 font-medium">{agent.connected} ({Math.round((agent.connected/agent.totalCalls)*100)}%)</td>
                    <td className="p-3">{agent.talkTime}</td>
                    <td className="p-3">{agent.recordings}</td>
                    <td className="p-3">
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold border border-emerald-500/20">
                        {agent.score}/100
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
