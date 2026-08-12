'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  User,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  PlayCircle,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';

function AudioCell({ call, idx }: { call: any; idx: number }) {
  const [hasError, setHasError] = useState(false);

  const isAnswered = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
  const hasRecording = call.audioUrl || call.s3Key || call.recordingStatus === 'COMPLETED' || call.recordingStatus === 'PENDING_UPLOAD';

  if (hasError || !isAnswered || call.recordingStatus === 'NONE' || (!hasRecording && !call.audioUrl)) {
    return <span className="text-slate-400 font-medium text-[11px]">No Recording</span>;
  }

  const audioSrc = call.audioUrl || `/api/v1/recordings/${call.idempotencyKey || call._id || call.id || idx}/audio`;

  return (
    <audio
      controls
      preload="none"
      src={audioSrc}
      onError={() => setHasError(true)}
      className="h-8 max-w-[180px] inline-block"
    />
  );
}

function SalestrailCallsInner() {
  const [callsList, setCallsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters from Salestrail UI screenshot
  const [dateRange, setDateRange] = useState('All time');
  const [repCategory, setRepCategory] = useState('Teams');
  const [subFilter, setSubFilter] = useState('All Teams');
  const [searchQuery, setSearchQuery] = useState('');

  const defaultTeams = ['Global Sales', 'NCLEX Counselors', 'DHA Counselors', 'Sales Team'];

  const handleRepCategoryChange = (cat: string) => {
    setRepCategory(cat);
    if (cat === 'Individual') {
      setSubFilter('All Counselors');
    } else {
      setSubFilter('All Teams');
    }
  };

  const [counselorsList, setCounselorsList] = useState<any[]>([]);
  const [assigningDeviceId, setAssigningDeviceId] = useState<string | null>(null);

  const fetchCalls = async () => {
    try {
      if (callsList.length === 0) setLoading(true);
      const res = await fetch('/api/v1/calls', {
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer mock_jwt_token',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const apiCalls = Array.isArray(data) ? data : data.calls || [];
        setCallsList(apiCalls);
      }
    } catch (err) {
      console.error('Error fetching live calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProvisionedCounselors = async () => {
    try {
      const res = await fetch('/api/v1/auth/counselors', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCounselorsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching counselors list:', err);
    }
  };

  useEffect(() => {
    fetchCalls();
    fetchProvisionedCounselors();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignCounselor = async (deviceId: string, newCounselorName: string) => {
    if (!deviceId || !newCounselorName) return;
    try {
      setAssigningDeviceId(deviceId);
      const res = await fetch('/api/v1/calls/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, agentName: newCounselorName }),
      });
      if (res.ok) {
        // Optimistically update local call list state for matching deviceId
        setCallsList((prevCalls) =>
          prevCalls.map((c) => (c.deviceId === deviceId ? { ...c, agentName: newCounselorName } : c))
        );
        fetchCalls();
      }
    } catch (err) {
      console.error('Error assigning counselor:', err);
    } finally {
      setAssigningDeviceId(null);
    }
  };

  const resolveCounselorName = (call: any) => {
    // 1. Match by counselor email in counselorsList directory
    const callEmail = (call.counselorEmail || call.email || '').toLowerCase();
    if (callEmail && counselorsList.length > 0) {
      const user = counselorsList.find((u) => u.email?.toLowerCase() === callEmail);
      if (user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (fullName) return fullName;
      }
    }

    // 2. Match device ID or agent name alias with directory email
    if (counselorsList.length > 0) {
      const rawName = (call.agentName || call.counselorName || '').toLowerCase();
      const user = counselorsList.find((u) => {
        const prefix = u.email ? u.email.split('@')[0].toLowerCase() : '';
        const fName = (u.firstName || '').toLowerCase();
        return (prefix && rawName.includes(prefix)) || (fName && rawName.includes(fName));
      });
      if (user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (fullName) return fullName;
      }
    }

    const rawName = call.agentName || call.counselorName || call.userName || call.user || '';
    if (rawName && rawName !== 'Counselor Agent' && rawName !== 'Counselor' && !rawName.startsWith('ANDROID-')) {
      return rawName;
    }
    if (callEmail) {
      const prefix = callEmail.split('@')[0];
      return prefix.replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
    if (call.deviceId) {
      const cleanDev = call.deviceId.replace(/^ANDROID-/, '');
      const modelTag = cleanDev.split('-')[0] || cleanDev.slice(0, 10);
      return `Counselor (${modelTag})`;
    }
    return 'Counselor Agent';
  };

  // Get unique list of counselor names for dropdown
  const uniqueCounselors = Array.from(
    new Set(
      callsList
        .map((c) => resolveCounselorName(c))
        .concat(counselorsList.map((c) => (c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.email?.split('@')[0])))
        .filter(Boolean)
    )
  );

  // Filter calls by search and filters
  const filteredCalls = callsList.filter((call) => {
    // 0. Exclude non-call text/chat message entries
    const combined = `${call.phoneNumber || ''} ${call.leadName || ''} ${call.disposition || ''}`.toLowerCase();
    if (combined.includes('message') || combined.includes('messages') || combined.includes('unread')) {
      return false;
    }
    // 1. Search Query Filter
    const phone = call.phoneNumber || call.phoneNumberMasked || call.phone || '';
    const name = call.leadName || call.name || '';
    const user = resolveCounselorName(call);
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch =
      phone.toLowerCase().includes(searchLower) ||
      name.toLowerCase().includes(searchLower) ||
      user.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // 2. Date Range Filter
    if (dateRange !== 'All time' && dateRange !== 'Custom') {
      const callDate = call.startTime ? new Date(call.startTime) : new Date();
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
      }
    }

    // 3. Select Sales Rep / Team Filter
    if (repCategory === 'Individual') {
      if (subFilter !== 'All Counselors') {
        if (user.toLowerCase() !== subFilter.toLowerCase()) {
          return false;
        }
      }
    } else if (repCategory === 'Teams') {
      if (subFilter !== 'All Teams') {
        const teamName = call.team || call.teamName || call.department || '';
        if (teamName && teamName.toLowerCase() !== subFilter.toLowerCase()) {
          return false;
        }
      }
    }

    return true;
  });

  type SortField = 'user' | 'phone' | 'name' | 'type' | 'startTime' | 'direction' | 'status' | 'duration' | 'audio';
  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'startTime' || field === 'duration' ? 'desc' : 'asc');
    }
  };

  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'user': {
          const uA = resolveCounselorName(a);
          const uB = resolveCounselorName(b);
          cmp = uA.localeCompare(uB);
          break;
        }
        case 'phone': {
          const pA = a.phoneNumber || a.phoneNumberMasked || a.phone || '';
          const pB = b.phoneNumber || b.phoneNumberMasked || b.phone || '';
          cmp = pA.localeCompare(pB);
          break;
        }
        case 'name': {
          const pA = a.phoneNumber || a.phoneNumberMasked || a.phone || '';
          const pB = b.phoneNumber || b.phoneNumberMasked || b.phone || '';
          const nA = a.leadName || a.name || pA;
          const nB = b.leadName || b.name || pB;
          cmp = nA.localeCompare(nB);
          break;
        }
        case 'type': {
          const isWAA = (a.channel || '').toUpperCase() === 'WHATSAPP' || (a.disposition || '').toLowerCase().includes('whatsapp') || (a.idempotencyKey || '').startsWith('WA_');
          const isWAB = (b.channel || '').toUpperCase() === 'WHATSAPP' || (b.disposition || '').toLowerCase().includes('whatsapp') || (b.idempotencyKey || '').startsWith('WA_');
          const tA = isWAA ? 'WhatsApp' : 'SIM';
          const tB = isWAB ? 'WhatsApp' : 'SIM';
          cmp = tA.localeCompare(tB);
          break;
        }
        case 'startTime': {
          const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
          cmp = timeA - timeB;
          break;
        }
        case 'direction': {
          const isOutA = (a.direction || 'OUTGOING').toUpperCase() === 'OUTGOING' || (a.direction || '').toUpperCase() === 'OUTBOUND';
          const isOutB = (b.direction || 'OUTGOING').toUpperCase() === 'OUTGOING' || (b.direction || '').toUpperCase() === 'OUTBOUND';
          const dA = isOutA ? 'Outbound' : 'Inbound';
          const dB = isOutB ? 'Outbound' : 'Inbound';
          cmp = dA.localeCompare(dB);
          break;
        }
        case 'status': {
          const isAnsA = (a.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const isAnsB = (b.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const sA = isAnsA ? 'Answered' : 'Unanswered';
          const sB = isAnsB ? 'Answered' : 'Unanswered';
          cmp = sA.localeCompare(sB);
          break;
        }
        case 'duration': {
          const durA = Number(a.durationSeconds || 0);
          const durB = Number(b.durationSeconds || 0);
          cmp = durA - durB;
          break;
        }
        case 'audio': {
          const hasA = a.audioUrl || a.s3Key || a.recordingStatus === 'COMPLETED' ? 1 : 0;
          const hasB = b.audioUrl || b.s3Key || b.recordingStatus === 'COMPLETED' ? 1 : 0;
          cmp = hasA - hasB;
          break;
        }
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredCalls, sortField, sortOrder]);

  const renderSortHeader = (field: SortField, label: string, extraClasses = '') => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`p-4 text-center font-bold cursor-pointer select-none group hover:bg-slate-100/70 transition-colors ${extraClasses}`}
        title={`Sort by ${label} (${isActive ? (sortOrder === 'asc' ? 'Ascending' : 'Descending') : 'Click to sort'})`}
      >
        <div className="flex items-center justify-center space-x-1.5">
          <span>{label}</span>
          <span className="inline-flex items-center">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-brand-600 font-extrabold transition-transform duration-200" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-brand-600 font-extrabold transition-transform duration-200" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 opacity-60 group-hover:opacity-100 transition-all duration-200" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const exportCSV = () => {
    if (callsList.length === 0) {
      alert('No call records available to export.');
      return;
    }
    const headers = ['User', 'Phone Number', 'Name', 'Type', 'Call Time', 'Direction', 'Status', 'Duration'];
    const rows = callsList.map((c) => [
      resolveCounselorName(c),
      c.phoneNumber || c.phoneNumberMasked || '',
      c.leadName || c.phoneNumber || '',
      c.channel === 'WHATSAPP' ? 'WhatsApp' : 'SIM',
      c.startTime ? new Date(c.startTime).toLocaleString() : '',
      c.direction || 'Outbound',
      c.status || 'Answered',
      c.durationSeconds ? `${Math.floor(c.durationSeconds / 60)}m:${c.durationSeconds % 60}s` : '0s',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RecorderHub_Calls_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Navigation />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Header Right Bar: US Flag & Profile */}
        <div className="flex items-center justify-end space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md shadow-sm">
            <span>🇺🇸 US</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-sm shadow-sm">
            <User className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* Top Filter Toolbar (Matching Salestrail Screenshot) */}
        <div className="flex flex-wrap items-center space-x-6 text-xs font-semibold text-slate-700 pb-2">
          {/* Date Range Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-slate-900 font-bold text-sm">Date range</label>
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-2.5 pr-8 shadow-sm focus:outline-none min-w-[140px] cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="This week">This week</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This month">This month</option>
                <option value="All time">All time</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Select Sales Reps Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-slate-900 font-bold text-sm">Select sales reps</label>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  value={repCategory}
                  onChange={(e) => handleRepCategoryChange(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-2.5 pr-8 shadow-sm focus:outline-none min-w-[140px] cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="Teams">Teams</option>
                  <option value="Individual">Individual</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={subFilter}
                  onChange={(e) => setSubFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-2.5 pr-8 shadow-sm focus:outline-none min-w-[160px] cursor-pointer hover:border-slate-300 transition-colors"
                >
                  {repCategory === 'Individual' ? (
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
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-end pt-5 space-x-3">
            <button
              onClick={exportCSV}
              className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Title & Search Bar */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calls</h1>

          {/* Search Box (Right Aligned) */}
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name / number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Calls Table (Matching Salestrail Order) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-white text-slate-900 font-extrabold border-b border-slate-200">
                <tr>
                  {renderSortHeader('user', 'User', 'pl-6')}
                  {renderSortHeader('phone', 'Phone Number')}
                  {renderSortHeader('name', 'Name')}
                  {renderSortHeader('type', 'Type')}
                  {renderSortHeader('startTime', 'Call Time')}
                  {renderSortHeader('direction', 'Direction')}
                  {renderSortHeader('status', 'Status')}
                  {renderSortHeader('duration', 'Duration')}
                  {renderSortHeader('audio', 'Audio Recording', 'pr-6')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500 font-medium">
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          <span>Syncing live call records from mobile...</span>
                        </div>
                      ) : (
                        <span>No calls found matching filter. Make a call on your Android phone to log calls live!</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedCalls.map((call, idx) => {
                    const rawPhoneInput = call.phoneNumber || call.phoneNumberMasked || call.phone || '';
                    const digitsOnly = rawPhoneInput.replace(/\D/g, '');
                    const cleanPhone = digitsOnly.length >= 10 ? `+91 ${digitsOnly.slice(-10, -5)} ${digitsOnly.slice(-5)}` : (rawPhoneInput || '+91 99361 67436');
                    const contactName = call.leadName || call.name || cleanPhone;
                    const startTimeStr = call.startTime ? new Date(call.startTime).toLocaleString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }) : '08/08/2026 23:15:56';

                    const durationMins = call.durationSeconds ? Math.floor(call.durationSeconds / 60) : 0;
                    const durationSecs = call.durationSeconds ? call.durationSeconds % 60 : 0;
                    const durationStr = durationMins > 0 ? `${durationMins}m:${durationSecs}s` : `${durationSecs}s`;

                    const isAnswered = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
                    const isOutbound = (call.direction || 'OUTGOING').toUpperCase() === 'OUTGOING' || (call.direction || '').toUpperCase() === 'OUTBOUND';
                    const isWhatsApp =
                      (call.channel || '').toUpperCase() === 'WHATSAPP' ||
                      (call.disposition || '').toLowerCase().includes('whatsapp') ||
                      (call.idempotencyKey || '').startsWith('WA_');

                    return (
                      <tr key={call.id || call._id || idx} className="hover:bg-slate-50 transition-colors">
                        {/* User */}
                        <td className="p-4 pl-6 font-semibold text-slate-900 text-center">
                          {resolveCounselorName(call)}
                        </td>
                        {/* Phone Number */}
                        <td className="p-4 text-center font-mono font-medium text-slate-900">
                          {cleanPhone}
                        </td>
                        {/* Name */}
                        <td className="p-4 text-center font-medium text-slate-800">
                          {contactName}
                        </td>
                        {/* Type */}
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${isWhatsApp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-800'
                            }`}>
                            {isWhatsApp ? 'WhatsApp' : 'SIM'}
                          </span>
                        </td>
                        {/* Call Time */}
                        <td className="p-4 text-center font-mono text-slate-700 text-[11px]">
                          {startTimeStr}
                        </td>
                        {/* Direction */}
                        <td className="p-4 text-center font-medium text-slate-800">
                          {isOutbound ? 'Outbound' : 'Inbound'}
                        </td>
                        {/* Status */}
                        <td className="p-4 text-center font-medium text-slate-800">
                          {isAnswered ? 'Answered' : 'Unanswered'}
                        </td>
                        {/* Duration */}
                        <td className="p-4 text-center font-semibold text-slate-900">
                          {durationStr}
                        </td>
                        {/* Audio Recording */}
                        <td className="p-4 pr-6 text-center">
                          <AudioCell call={call} idx={idx} />
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

export default function SalestrailCallsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans"><main className="flex-1 p-8">Loading calls...</main></div>}>
      <SalestrailCallsInner />
    </Suspense>
  );
}
