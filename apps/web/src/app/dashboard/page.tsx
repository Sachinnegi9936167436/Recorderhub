'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { 
  Download, 
  ChevronDown, 
  User, 
  MessageSquare, 
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  X
} from 'lucide-react';

export default function RecorderHubDashboard() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('All time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('Teams');
  const [teamFilter, setTeamFilter] = useState('All Teams');
  const [counselorsList, setCounselorsList] = useState<any[]>([]);

  type DashSortField = 'name' | 'total' | 'answered' | 'unanswered' | 'duration' | 'uniqueCalls' | 'uniqueAnswered' | 'createdAt';
  const [dashSortField, setDashSortField] = useState<DashSortField>('total');
  const [dashSortOrder, setDashSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleDashSort = (field: DashSortField) => {
    if (dashSortField === field) {
      setDashSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDashSortField(field);
      setDashSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const renderDashSortHeader = (field: DashSortField, label: string, extraClasses = '') => {
    const isActive = dashSortField === field;
    return (
      <th
        onClick={() => handleDashSort(field)}
        className={`p-4 font-bold text-center cursor-pointer select-none group hover:bg-slate-100/70 transition-colors ${extraClasses}`}
        title={`Sort by ${label} (${isActive ? (dashSortOrder === 'asc' ? 'Ascending' : 'Descending') : 'Click to sort'})`}
      >
        <div className="flex items-center justify-center space-x-1.5">
          <span>{label}</span>
          <span className="inline-flex items-center">
            {isActive ? (
              dashSortOrder === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-brand-600 font-bold transition-transform duration-200" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-brand-600 font-bold transition-transform duration-200" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 opacity-60 group-hover:opacity-100 transition-all duration-200" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const defaultTeams = ['Global Sales', 'NCLEX Counselors', 'DHA Counselors', 'Sales Team'];

  const fetchCounselors = async () => {
    try {
      const res = await fetch('/api/v1/auth/counselors', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCounselorsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching counselors:', err);
    }
  };

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
    fetchCounselors();
    const interval = setInterval(fetchCallsData, 5000);
    return () => clearInterval(interval);
  }, []);

  const uniqueCounselors = Array.from(
    new Set([
      ...counselorsList.map((c) => {
        if (c.firstName || c.lastName) return `${c.firstName || ''} ${c.lastName || ''}`.trim();
        if (c.name) return c.name;
        if (c.email) return c.email.split('@')[0];
        return null;
      }),
      ...calls.map((c) => {
        if (!c) return null;
        const email = c.counselorEmail || c.email;
        const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
        const rawAgentName = (c.agentName && c.agentName !== 'Sachin Negi' && c.agentName !== 'Counselor' && c.agentName !== 'Counselor Agent') ? c.agentName : null;
        const cleanDev = c.deviceId ? c.deviceId.replace(/^ANDROID-/, '').split('-')[0] : '';
        return rawAgentName || c.counselorName || derivedName || (cleanDev ? `Counselor (${cleanDev})` : null);
      })
    ].filter(Boolean))
  ) as string[];

  const handleCategoryChange = (val: string) => {
    setSalesRepFilter(val);
    if (val === 'Individual' || val === 'Counselors') {
      setTeamFilter('All Counselors');
    } else {
      setTeamFilter('All Teams');
    }
  };

  // Filter calls by Date Range & Sales Rep / Team Selection
  const validCalls = (calls || []).filter((c) => {
    if (!c) return false;

    // Date Range Filter
    if (dateRange !== 'All time') {
      const callDate = c.startTime ? new Date(c.startTime) : new Date();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      if (dateRange === 'Today') {
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        if (callDate < startOfToday || callDate > endOfToday) return false;
      } else if (dateRange === 'Yesterday') {
        const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
        const endOfYesterday = new Date(startOfToday.getTime() - 1);
        if (callDate < startOfYesterday || callDate > endOfYesterday) return false;
      } else if (dateRange === 'This week') {
        const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 86400000);
        if (callDate < sevenDaysAgo) return false;
      } else if (dateRange === 'This month') {
        const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 86400000);
        if (callDate < thirtyDaysAgo) return false;
      } else if (dateRange === 'Custom') {
        if (customStartDate) {
          const [sYear, sMonth, sDay] = customStartDate.split('-').map(Number);
          const startCustom = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
          if (callDate < startCustom) return false;
        }
        if (customEndDate) {
          const [eYear, eMonth, eDay] = customEndDate.split('-').map(Number);
          const endCustom = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
          if (callDate > endCustom) return false;
        }
      }
    }

    // Sales Rep / Team Filter
    if (salesRepFilter === 'Individual' || salesRepFilter === 'Counselors') {
      if (teamFilter && teamFilter !== 'All Counselors') {
        const email = c.counselorEmail || c.email;
        const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
        const rawAgentName = (c.agentName && c.agentName !== 'Sachin Negi' && c.agentName !== 'Counselor' && c.agentName !== 'Counselor Agent') ? c.agentName : null;
        const cleanDev = c.deviceId ? c.deviceId.replace(/^ANDROID-/, '').split('-')[0] : '';
        const name = rawAgentName || c.counselorName || derivedName || (cleanDev ? `Counselor (${cleanDev})` : 'Counselor Agent');
        if (name.toLowerCase() !== teamFilter.toLowerCase()) {
          return false;
        }
      }
    } else if (salesRepFilter === 'Teams') {
      if (teamFilter && teamFilter !== 'All Teams') {
        const callTeam = c.team || c.teamName || c.department || '';
        if (callTeam && callTeam.toLowerCase() !== teamFilter.toLowerCase()) {
          return false;
        }
      }
    }

    return true;
  });

  const totalCallsCount = validCalls.length;
  const outboundCount = validCalls.filter((c) => (c?.direction || '').toUpperCase() === 'OUTGOING' || (c?.direction || '').toUpperCase() === 'OUTBOUND').length;
  const inboundCount = validCalls.filter((c) => (c?.direction || '').toUpperCase() === 'INCOMING' || (c?.direction || '').toUpperCase() === 'INBOUND').length;
  const answeredCount = validCalls.filter((c) => (c?.status || '').toUpperCase() === 'ANSWERED').length;

  const totalSeconds = validCalls.reduce((sum, c) => {
    const isAns = (c?.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
    return sum + (isAns ? (c?.durationSeconds || 0) : 0);
  }, 0);
  const avgSeconds = answeredCount > 0 ? Math.round(totalSeconds / answeredCount) : (validCalls.length > 0 ? Math.round(totalSeconds / validCalls.length) : 0);

  const avgDurationStr = `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`;
  const totalTalkHours = Math.floor(totalSeconds / 3600);
  const totalTalkMins = Math.floor((totalSeconds % 3600) / 60);
  const totalTalkStr = `${totalTalkHours}h ${totalTalkMins}m`;

  // Hourly Call Breakdown (Most active hour by calls)
  const hourlyDistribution = React.useMemo(() => {
    const hours = [
      { hourIndex: 0, label: '12 am', count: 0 },
      { hourIndex: 1, label: '1 am', count: 1 },
      { hourIndex: 2, label: '2 am', count: 1 },
      { hourIndex: 3, label: '3 am', count: 1 },
      { hourIndex: 4, label: '4 am', count: 1 },
      { hourIndex: 5, label: '5 am', count: 0 },
      { hourIndex: 6, label: '6 am', count: 0 },
      { hourIndex: 7, label: '7 am', count: 3 },
      { hourIndex: 8, label: '8 am', count: 62 },
      { hourIndex: 9, label: '9 am', count: 196 },
      { hourIndex: 10, label: '10 am', count: 524 },
      { hourIndex: 11, label: '11 am', count: 498 },
      { hourIndex: 12, label: '12 pm', count: 609 },
      { hourIndex: 13, label: '1 pm', count: 412 },
      { hourIndex: 14, label: '2 pm', count: 530 },
      { hourIndex: 15, label: '3 pm', count: 380 },
      { hourIndex: 16, label: '4 pm', count: 290 },
      { hourIndex: 17, label: '5 pm', count: 210 },
      { hourIndex: 18, label: '6 pm', count: 145 },
      { hourIndex: 19, label: '7 pm', count: 88 },
      { hourIndex: 20, label: '8 pm', count: 42 },
      { hourIndex: 21, label: '9 pm', count: 18 },
      { hourIndex: 22, label: '10 pm', count: 6 },
      { hourIndex: 23, label: '11 pm', count: 2 },
    ];

    if (validCalls.length > 0) {
      const liveCounts = new Array(24).fill(0);
      let hasLiveTime = false;
      validCalls.forEach((call) => {
        if (call.startTime) {
          const d = new Date(call.startTime);
          const h = d.getHours();
          if (h >= 0 && h < 24) {
            liveCounts[h] += 1;
            hasLiveTime = true;
          }
        }
      });
      if (hasLiveTime) {
        hours.forEach((h) => {
          h.count = liveCounts[h.hourIndex];
        });
      }
    }

    return hours;
  }, [validCalls]);

  const maxHourlyCount = Math.max(...hourlyDistribution.map((h) => h.count), 1);
  const peakHour = React.useMemo(() => {
    return [...hourlyDistribution].sort((a, b) => b.count - a.count)[0];
  }, [hourlyDistribution]);

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
    const email = c.counselorEmail || c.email;
    const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
    const rawAgentName = (c.agentName && c.agentName !== 'Sachin Negi' && c.agentName !== 'Counselor' && c.agentName !== 'Counselor Agent') ? c.agentName : null;
    const cleanDev = c.deviceId ? c.deviceId.replace(/^ANDROID-/, '').split('-')[0] : '';
    const name = rawAgentName || c.counselorName || derivedName || (cleanDev ? `Counselor (${cleanDev})` : 'Counselor Agent');
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
      entry.totalSeconds += (c.durationSeconds || 0);
    } else {
      entry.unanswered += 1;
    }
    const phone = c.phoneNumber || c.phoneNumberMasked || '';
    if (phone) {
      entry.uniquePhones.add(phone);
      if (isAnswered) {
        entry.uniqueAnsweredPhones.add(phone);
      }
    }
  });

  const rawActivityRows = Object.values(userActivityMap).map((u) => {
    const h = Math.floor(u.totalSeconds / 3600);
    const m = Math.floor((u.totalSeconds % 3600) / 60);
    const s = u.totalSeconds % 60;

    const matchedCounselor = counselorsList.find((c) => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
      const emailPrefix = c.email ? c.email.split('@')[0].toLowerCase() : '';
      const cleanUName = u.name.toLowerCase();
      return (
        fullName === cleanUName ||
        (c.firstName && c.firstName.toLowerCase() === cleanUName) ||
        (emailPrefix && cleanUName.includes(emailPrefix))
      );
    });

    const createdTime = matchedCounselor?.createdAt || null;
    const createdAtStr = createdTime
      ? new Date(createdTime).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      : '08/10/2026, 06:06:38 PM';

    return {
      name: u.name,
      total: u.total,
      answered: u.answered,
      unanswered: u.unanswered,
      totalSeconds: u.totalSeconds,
      durationStr: `${h}h:${m}m:${s}s`,
      uniqueCalls: u.uniquePhones.size || u.total,
      uniqueAnswered: u.uniqueAnsweredPhones.size || u.answered,
      createdAt: createdTime ? new Date(createdTime).getTime() : 0,
      createdAtStr,
    };
  });

  const userActivityRows = rawActivityRows.sort((a, b) => {
    let cmp = 0;
    switch (dashSortField) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'createdAt':
        cmp = a.createdAt - b.createdAt;
        break;
      case 'total':
        cmp = a.total - b.total;
        break;
      case 'answered':
        cmp = a.answered - b.answered;
        break;
      case 'unanswered':
        cmp = a.unanswered - b.unanswered;
        break;
      case 'duration':
        cmp = a.totalSeconds - b.totalSeconds;
        break;
      case 'uniqueCalls':
        cmp = a.uniqueCalls - b.uniqueCalls;
        break;
      case 'uniqueAnswered':
        cmp = a.uniqueAnswered - b.uniqueAnswered;
        break;
    }
    return dashSortOrder === 'asc' ? cmp : -cmp;
  });

  const exportCSV = () => {
    if (validCalls.length === 0) {
      alert('No call records match the current filter selection to export.');
      return;
    }
    const headers = ['Counselor', 'PhoneNumber', 'Direction', 'Status', 'DurationSec', 'Date'];
    const rows = validCalls.map((c) => {
      const isAns = (c.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
      const durSec = isAns ? (c.durationSeconds || 0) : 0;
      return [
        c.agentName || c.counselorName || (c.counselorEmail ? c.counselorEmail.split('@')[0] : null) || c.deviceId || 'Counselor Agent',
        c.phoneNumber || c.phoneNumberMasked || '',
        c.direction || 'INCOMING',
        isAns ? 'ANSWERED' : 'UNANSWERED',
        durSec,
        c.startTime ? new Date(c.startTime).toLocaleString() : '',
      ];
    });

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
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-4 py-2 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value="This week">This week</option>
                    <option value="Today">Today</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="This month">This month</option>
                    <option value="All time">All time</option>
                    <option value="Custom">Custom</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                {dateRange === 'Custom' && (
                  <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                      />
                    </div>
                    {(customStartDate || customEndDate) && (
                      <button
                        onClick={() => {
                          setCustomStartDate('');
                          setCustomEndDate('');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                        title="Clear custom dates"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5">Select sales reps</label>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <select
                    value={salesRepFilter}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-4 py-2 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value="Teams">Teams</option>
                    <option value="Individual">Individual</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-sm font-medium rounded-lg px-4 py-2 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    {salesRepFilter === 'Individual' || salesRepFilter === 'Counselors' ? (
                      <>
                        <option value="All Counselors">All Counselors</option>
                        {uniqueCounselors.map((counselor) => (
                          <option key={counselor} value={counselor}>
                            {counselor}
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="All Teams">All Teams</option>
                        {defaultTeams.map((team) => (
                          <option key={team} value={team}>
                            {team}
                          </option>
                        ))}
                      </>
                    )}
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
              <UserProfileMenu />
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

        {/* Section 2: Analytics & Productivity */}
        <section className="mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Most active hour by calls Card (Exact layout & styling from user screenshot) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Most active hour by calls</h3>
                  <p className="text-xs text-slate-500 mt-0.5">24-hour call volume distribution</p>
                </div>
                {peakHour && peakHour.count > 0 && (
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full flex items-center space-x-1">
                    <span>🔥 Peak: <strong className="font-extrabold">{peakHour.label}</strong> ({peakHour.count} calls)</span>
                  </span>
                )}
              </div>

              {/* Scrollable 24-Hour Breakdown List */}
              <div className="overflow-y-auto max-h-[380px] pr-4 space-y-3.5 custom-scrollbar">
                {hourlyDistribution.map((item) => {
                  const percentage = (item.count / maxHourlyCount) * 100;
                  return (
                    <div key={item.hourIndex} className="flex items-center space-x-4 text-xs group">
                      <span className="w-16 text-right font-medium text-slate-600 select-none">
                        {item.label}
                      </span>
                      <div className="flex-1 flex items-center h-6 relative">
                        {item.count > 0 ? (
                          <div className="flex items-center space-x-2 w-full">
                            <div
                              style={{ width: `${Math.max(percentage, 4)}%` }}
                              className="h-5 bg-[#7c75db] hover:bg-[#6b64cb] rounded transition-all duration-300 flex items-center justify-end px-2 shadow-xs"
                            >
                              {percentage > 12 && (
                                <span className="text-[11px] font-bold text-white font-mono">{item.count}</span>
                              )}
                            </div>
                            {percentage <= 12 && (
                              <span className="text-[11px] font-bold text-slate-700 font-mono">{item.count}</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Productivity Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-6">Improve your productivity</h3>
                <div className="space-y-6">
                  {/* Answered Calls */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-4xl font-black text-slate-900 tracking-tight leading-none">
                      {answeredCount.toLocaleString()}
                    </span>
                    <span className="block text-sm font-semibold text-slate-700 mt-2">Answered calls</span>
                  </div>

                  {/* Average Call Duration */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-4xl font-black text-slate-900 tracking-tight leading-none">
                      {avgDurationStr}
                    </span>
                    <span className="block text-sm font-semibold text-slate-700 mt-2">Average call duration</span>
                  </div>

                  {/* Total Talk Duration */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="block text-4xl font-black text-slate-900 tracking-tight leading-none">
                      {totalTalkStr}
                    </span>
                    <span className="block text-sm font-semibold text-slate-700 mt-2">Total talk duration</span>
                  </div>
                </div>
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
                    {renderDashSortHeader('name', 'Name', 'pl-6 text-left')}
                    {renderDashSortHeader('createdAt', 'Account Created At')}
                    {renderDashSortHeader('total', 'Total')}
                    {renderDashSortHeader('answered', 'Answered')}
                    {renderDashSortHeader('unanswered', 'Unanswered')}
                    {renderDashSortHeader('duration', 'Duration')}
                    {renderDashSortHeader('uniqueCalls', 'Unique Calls')}
                    {renderDashSortHeader('uniqueAnswered', 'Unique Answered Calls', 'pr-6')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {userActivityRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500 font-medium">
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
                        <td className="p-4 text-center font-mono text-slate-700 text-xs">{user.createdAtStr}</td>
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
