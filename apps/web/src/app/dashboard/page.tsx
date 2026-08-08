'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, Mic, Users, TrendingUp, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('Last 7 Days');
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCallsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/v1/calls', {
        headers: {
          Authorization: 'Bearer mock_jwt_token',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const apiCalls = data.calls || data || [];
        setCalls(apiCalls);
      }
    } catch (err) {
      console.error('Error fetching dashboard calls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallsData();
    const interval = setInterval(fetchCallsData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute live KPI metrics
  const totalCalls = calls.length;
  const outgoingCalls = calls.filter((c) => c.direction === 'OUTGOING').length;
  const incomingCalls = calls.filter((c) => c.direction === 'INCOMING').length;
  
  const answeredCalls = calls.filter((c) => c.status === 'ANSWERED').length;
  const connectionRate = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : '0.0';

  const totalDurationSeconds = calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
  const totalTalkTimeMinutes = Math.floor(totalDurationSeconds / 60);
  const talkHours = Math.floor(totalTalkTimeMinutes / 60);
  const talkMins = totalTalkTimeMinutes % 60;
  const talkTimeStr = `${talkHours}h ${talkMins}m`;

  const recordingsCount = calls.filter((c) => c.recordingStatus === 'UPLOADED' || c.recordingPath).length;
  const recordingCoverage = totalCalls > 0 ? ((recordingsCount / totalCalls) * 100).toFixed(1) : '0.0';

  // Group call volume by day for chart
  const timeSeriesData = [
    { date: 'Today', callVolume: totalCalls, talkTimeMinutes: totalTalkTimeMinutes },
  ];

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
              <span className="text-3xl font-bold text-white">{totalCalls}</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" /> Live
              </span>
            </div>
            <p className="text-xs text-slate-400">{outgoingCalls} Outgoing • {incomingCalls} Incoming</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Connection Rate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{connectionRate}%</span>
              <span className="text-xs text-emerald-400 font-medium">Real-time</span>
            </div>
            <p className="text-xs text-slate-400">{answeredCalls} Answered • {totalCalls - answeredCalls} Unanswered</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Talk Time</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{talkTimeStr}</span>
              <span className="text-xs text-slate-400">Active duration</span>
            </div>
            <p className="text-xs text-slate-400">Avg {totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0}s / call</p>
          </div>

          <div className="glass-panel p-5 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Recording Coverage</span>
              <Mic className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-white">{recordingCoverage}%</span>
              <span className="text-xs text-emerald-400 font-medium">SAF Active</span>
            </div>
            <p className="text-xs text-slate-400">{recordingsCount} Audio files synced</p>
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
              <span className="text-xs font-medium text-brand-400 bg-brand-600/10 px-2.5 py-1 rounded border border-brand-500/20 flex items-center space-x-1">
                {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                <span>Live Data</span>
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
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
              {calls.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No live call activity logged yet.</p>
              ) : (
                calls.slice(0, 3).map((call) => (
                  <div key={call.id || call._id || call.idempotencyKey} className="flex space-x-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      {call.direction === 'OUTGOING' ? <PhoneOutgoing className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">{call.agentName || call.deviceId} called <span className="text-white font-semibold">{call.phoneNumber}</span></p>
                      <p className="text-slate-400 text-[11px]">{call.disposition || 'New Lead Inquiry'} • {call.durationSeconds}s</p>
                      <span className="text-[10px] text-slate-500">{call.startTime ? new Date(call.startTime).toLocaleTimeString() : 'Just now'}</span>
                    </div>
                  </div>
                ))
              )}
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
                {calls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No counselor call records logged in MongoDB database yet.
                    </td>
                  </tr>
                ) : (
                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-brand-400">#1</td>
                    <td className="p-3 font-medium text-white">Ananya Sharma (Xiaomi 2411)</td>
                    <td className="p-3">{totalCalls}</td>
                    <td className="p-3 text-emerald-400 font-medium">{answeredCalls} ({connectionRate}%)</td>
                    <td className="p-3">{talkTimeStr}</td>
                    <td className="p-3">{recordingsCount}</td>
                    <td className="p-3">
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold border border-emerald-500/20">
                        94/100
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
