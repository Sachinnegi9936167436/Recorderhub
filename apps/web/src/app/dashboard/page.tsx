'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { 
  Download, 
  ChevronDown, 
  User, 
  MessageSquare, 
  RefreshCw,
  ArrowUpDown,
  ArrowUp
} from 'lucide-react';

export default function RecorderHubDashboard() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('All time');
  const [salesRepFilter, setSalesRepFilter] = useState('Teams');
  const [teamFilter, setTeamFilter] = useState('All Teams');

  const fetchCallsData = async () => {
    try {
      if (calls.length === 0) setLoading(true);
      const res = await fetch('/api/v1/calls', {
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer mock_jwt_token',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const apiCalls = Array.isArray(data) ? data : data.calls || [];
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

  // Filter calls by Date Range
  const validCalls = (calls || []).filter((c) => {
    if (!c) return false;
    if (dateRange === 'All time') return true;
    const callDate = c.startTime ? new Date(c.startTime) : new Date();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (dateRange === 'Today') {
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return callDate >= startOfToday && callDate <= endOfToday;
    } else if (dateRange === 'This week') {
      const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 86400000);
      return callDate >= sevenDaysAgo;
    } else if (dateRange === 'This month') {
      const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 86400000);
      return callDate >= thirtyDaysAgo;
    }
    return true;
  });

  const totalCallsCount = validCalls.length;
  const outboundCount = validCalls.filter((c) => (c?.direction || '').toUpperCase() === 'OUTGOING' || (c?.direction || '').toUpperCase() === 'OUTBOUND').length;
  const inboundCount = validCalls.filter((c) => (c?.direction || '').toUpperCase() === 'INCOMING' || (c?.direction || '').toUpperCase() === 'INBOUND').length;
  const answeredCount = validCalls.filter((c) => (c?.status || '').toUpperCase() === 'ANSWERED').length;

  const totalSeconds = validCalls.reduce((sum, c) => sum + (c?.durationSeconds || 0), 0);
  const avgSeconds = validCalls.length > 0 ? Math.round(totalSeconds / validCalls.length) : 0;

  const avgDurationStr = `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`;
  const totalTalkHours = Math.floor(totalSeconds / 3600);
  const totalTalkMins = Math.floor((totalSeconds % 3600) / 60);
  const totalTalkStr = `${totalTalkHours}h ${totalTalkMins}m`;

  // Group calls by Counselor / Agent Name
  const userActivityMap: Record<string, {
    name: string;
    total: number;
    answered: number;
    unanswered: number;
    totalSeconds: number;
    uniquePhones: Set<string>;
    uniqueAnsweredPhones: Set<string>;
  }> = {};

  validCalls.forEach((c) => {
    if (!c) return;
    const name = c.agentName || c.counselorName || c.deviceId || 'Counselor';
    if (!userActivityMap[name]) {
      userActivityMap[name] = {
        name,
        total: 0,
        answered: 0,
        unanswered: 0,
        totalSeconds: 0,
        uniquePhones: new Set(),
        uniqueAnsweredPhones: new Set(),
      };
    }
    const entry = userActivityMap[name];
    entry.total += 1;
    const isAnswered = (c.status || '').toUpperCase() === 'ANSWERED';
    if (isAnswered) {
      entry.answered += 1;
    } else {
      entry.unanswered += 1;
    }
    entry.totalSeconds += (c.durationSeconds || 0);
    const phone = c.phoneNumber || c.phoneNumberMasked || '';
    if (phone) {
      entry.uniquePhones.add(phone);
      if (isAnswered) {
        entry.uniqueAnsweredPhones.add(phone);
      }
    }
  });

  const userActivityRows = Object.values(userActivityMap).map((u) => {
    const h = Math.floor(u.totalSeconds / 3600);
    const m = Math.floor((u.totalSeconds % 3600) / 60);
    const s = u.totalSeconds % 60;
    return {
      name: u.name,
      total: u.total,
      answered: u.answered,
      unanswered: u.unanswered,
      durationStr: `${h}h:${m}m:${s}s`,
      uniqueCalls: u.uniquePhones.size || u.total,
      uniqueAnswered: u.uniqueAnsweredPhones.size || u.answered,
    };
  }).sort((a, b) => b.total - a.total);

  const exportCSV = () => {
    if (calls.length === 0) {
      alert('No call records available to export.');
      return;
    }
    const headers = ['Counselor', 'PhoneNumber', 'Direction', 'Status', 'DurationSec', 'Date'];
    const rows = calls.map((c) => [
      c.agentName || c.deviceId || 'Counselor Agent',
      c.phoneNumber || c.phoneNumberMasked || '',
      c.direction || 'INCOMING',
      c.status || 'ANSWERED',
      c.durationSeconds || 0,
      c.startTime ? new Date(c.startTime).toLocaleString() : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RecorderHub_Calls_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Navigation />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between pb-8">
          {/* Left Filters */}
          <div className="flex items-center space-x-6">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">Date range</label>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-4 py-2 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option>This week</option>
                  <option>Today</option>
                  <option>This month</option>
                  <option>All time</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">Select sales reps</label>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <select
                    value={salesRepFilter}
                    onChange={(e) => setSalesRepFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-4 py-2 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option>Teams</option>
                    <option>Counselors</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-4 py-2 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option>All Teams</option>
                    <option>NCLEX Counselors</option>
                    <option>DHA Counselors</option>
                    <option>Global Sales</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Icons & CSV Export */}
          <div className="flex items-center space-x-5">
            <button
              onClick={exportCSV}
              className="flex items-center space-x-2 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export as CSV</span>
            </button>

            <div className="flex items-center space-x-3 border-l border-slate-200 pl-5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md shadow-sm">
                <span>🇺🇸 US</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-sm shadow-sm">
                <User className="w-5 h-5 text-slate-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Section 1: Overview Card */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Get an overview of your call activity</h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 shadow-sm">
            <div className="grid grid-cols-3 gap-8">
              {/* Total Calls */}
              <div>
                <span className="block text-5xl font-black text-slate-900 tracking-tight leading-none">
                  {totalCallsCount.toLocaleString()}
                </span>
                <span className="block text-base font-semibold text-slate-700 mt-2">Calls</span>
              </div>

              {/* Outbound Calls */}
              <div>
                <span className="block text-5xl font-black text-slate-900 tracking-tight leading-none">
                  {outboundCount.toLocaleString()}
                </span>
                <span className="block text-base font-semibold text-slate-700 mt-2">Outbound calls</span>
              </div>

              {/* Inbound Calls */}
              <div>
                <span className="block text-5xl font-black text-slate-900 tracking-tight leading-none">
                  {inboundCount.toLocaleString()}
                </span>
                <span className="block text-base font-semibold text-slate-700 mt-2">Inbound calls</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Productivity Card */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Improve your productivity</h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-10 shadow-sm">
            <div className="grid grid-cols-3 gap-8">
              {/* Answered Calls */}
              <div>
                <span className="block text-5xl font-black text-slate-900 tracking-tight leading-none">
                  {answeredCount.toLocaleString()}
                </span>
                <span className="block text-base font-semibold text-slate-700 mt-2">Answered calls</span>
              </div>

              {/* Average Call Duration */}
              <div>
                <span className="block text-5xl font-black text-slate-900 tracking-tight leading-none">
                  {avgDurationStr}
                </span>
                <span className="block text-base font-semibold text-slate-700 mt-2">Average call duration</span>
              </div>

              {/* Total Talk Duration */}
              <div>
                <span className="block text-5xl font-black text-slate-900 tracking-tight leading-none">
                  {totalTalkStr}
                </span>
                <span className="block text-base font-semibold text-slate-700 mt-2">Total talk duration</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: User Activity Table */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">User activity</h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-white text-slate-900 font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-4 pl-6 font-bold">
                      <div className="flex items-center space-x-1">
                        <span>Name</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-4 text-center font-bold">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Total</span>
                        <ArrowUp className="w-3.5 h-3.5 text-slate-800" />
                      </div>
                    </th>
                    <th className="p-4 text-center font-bold">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Answered</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-4 text-center font-bold">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Unanswered</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-4 text-center font-bold">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Duration</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-4 text-center font-bold">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Unique Calls</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-4 text-center font-bold pr-6">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Unique Answered Calls</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {userActivityRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                        {loading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                            <span>Loading user activity from mobile calls...</span>
                          </div>
                        ) : (
                          <span>No counselor call activity recorded yet. Sync calls from your mobile app to see live user activity!</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    userActivityRows.map((user, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-slate-900">{user.name}</td>
                        <td className="p-4 text-center text-slate-800 font-medium">{user.total}</td>
                        <td className="p-4 text-center text-slate-800 font-medium">{user.answered}</td>
                        <td className="p-4 text-center text-slate-800 font-medium">{user.unanswered}</td>
                        <td className="p-4 text-center font-mono text-slate-800">{user.durationStr}</td>
                        <td className="p-4 text-center text-slate-800 font-medium">{user.uniqueCalls}</td>
                        <td className="p-4 text-center text-slate-800 font-medium pr-6">{user.uniqueAnswered}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Floating Pink Chat Support Circle */}
        <div className="fixed bottom-6 right-6 z-40">
          <button className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 flex items-center justify-center relative transition-transform hover:scale-105">
            <MessageSquare className="w-6 h-6 fill-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-rose-600 font-bold text-[10px] flex items-center justify-center border border-rose-500">
              1
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
