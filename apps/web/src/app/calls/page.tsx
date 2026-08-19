'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Navigation, useUserRole } from '@/components/Navigation';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { useSearchParams } from 'next/navigation';
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  X
} from 'lucide-react';

function AudioCell({ call, idx }: { call: any; idx: number }) {
  const [hasError, setHasError] = useState(false);

  const isAnswered = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
  const hasRecording = call.audioUrl || call.s3Key || call.recordingStatus === 'COMPLETED' || call.recordingStatus === 'PENDING_UPLOAD';

  if (hasError || !isAnswered || call.recordingStatus === 'NONE' || (!hasRecording && !call.audioUrl)) {
    return <span className="text-slate-400 font-medium text-[11px]">No Recording</span>;
  }

  const audioSrc = call.audioUrl || (call.s3Key ? `/api/v1/recordings/stream?key=${encodeURIComponent(call.s3Key)}` : null);

  if (!audioSrc) {
    return <span className="text-slate-400 font-medium text-[11px]">No Recording</span>;
  }

  return (
    <div className="flex items-center space-x-2 py-1">
      <audio
        controls
        preload="metadata"
        src={audioSrc}
        onError={() => setHasError(true)}
        className="h-7 w-48 rounded-md bg-slate-100 border border-slate-200 shadow-xs focus:outline-none"
      />
    </div>
  );
}

function SalestrailCallsInner() {
  const { role, email: userEmail, isAdmin, isManager, isTeamLead, isCounselor } = useUserRole();
  const searchParams = useSearchParams();
  const isRecordingsOnly = searchParams.get('filter') === 'recordings';

  const [callsList, setCallsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters from Salestrail UI screenshot
  const [dateRange, setDateRange] = useState('All time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
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
    // RBAC check: Counselor role can view ONLY their own call logs, Team Lead can view ALL calls in their team
    if (isCounselor) {
      const resolvedUser = resolveCounselorName(call).toLowerCase();
      const callEmail = (call.counselorEmail || call.email || '').toLowerCase();
      const myEmailPrefix = userEmail ? userEmail.split('@')[0].toLowerCase() : '';

      const isMyCall =
        (callEmail && callEmail === userEmail.toLowerCase()) ||
        (myEmailPrefix && resolvedUser.includes(myEmailPrefix)) ||
        (resolvedUser.includes('shristi') && myEmailPrefix.includes('shris'));

      if (!isMyCall) return false;
    } else if (isTeamLead) {
      // Team Lead can view ALL call logs & recordings for counselors in their team
      const resolvedUser = resolveCounselorName(call).toLowerCase();
      const callEmail = (call.counselorEmail || call.email || '').toLowerCase();

      const myTeamMembers = ['nasreen', 'vasantha', 'manas vikas', 'sachin negi', 'shristi', 'shrishtik', 'rajdeep', 'ananya', 'rahul', 'dev', 'himanshu', 'raja', 'prakhar', 'bilal', 'shalini', 'shruti'];

      const isTeamCall =
        (callEmail && callEmail === userEmail.toLowerCase()) ||
        myTeamMembers.some((m) => resolvedUser.includes(m) || callEmail.includes(m));

      if (!isTeamCall) return false;
    }

    // 0. Exclude non-call text/chat message entries
    const combined = `${call.phoneNumber || ''} ${call.leadName || ''} ${call.disposition || ''}`.toLowerCase();
    if (combined.includes('message') || combined.includes('messages') || combined.includes('unread')) {
      return false;
    }

    // 0.5. Filter for recordings view if ?filter=recordings query param is active
    if (isRecordingsOnly) {
      const hasRecording = call.audioUrl || call.s3Key || call.recordingStatus === 'COMPLETED' || call.recordingStatus === 'PENDING_UPLOAD';
      if (!hasRecording || call.recordingStatus === 'NONE') {
        return false;
      }
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
    if (dateRange !== 'All time') {
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to Page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateRange, customStartDate, customEndDate, repCategory, subFilter, isRecordingsOnly]);

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
          const isAnsA = (a.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const isAnsB = (b.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const durA = isAnsA ? Number(a.durationSeconds || 0) : 0;
          const durB = isAnsB ? Number(b.durationSeconds || 0) : 0;
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

  const totalRecords = sortedCalls.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const paginatedCalls = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedCalls.slice(startIdx, startIdx + pageSize);
  }, [sortedCalls, currentPage, pageSize]);

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
    if (sortedCalls.length === 0) {
      alert('No call records match the current filter selection to export.');
      return;
    }
    const headers = ['User', 'Phone Number', 'Name', 'Type', 'Call Time', 'Direction', 'Status', 'Duration'];
    const rows = sortedCalls.map((c) => {
      const isAns = (c.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
      const durSec = isAns ? Number(c.durationSeconds || 0) : 0;
      return [
        resolveCounselorName(c),
        c.phoneNumber || c.phoneNumberMasked || '',
        c.leadName || c.phoneNumber || '',
        c.channel === 'WHATSAPP' ? 'WhatsApp' : 'SIM',
        c.startTime ? new Date(c.startTime).toLocaleString() : '',
        c.direction || 'Outbound',
        isAns ? 'Answered' : 'Unanswered',
        durSec > 0 ? `${Math.floor(durSec / 60)}m:${durSec % 60}s` : '0s',
      ];
    });

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
        {/* Header Right Bar: Profile Menu */}
        <div className="flex items-center justify-end">
          <UserProfileMenu />
        </div>

        {/* Top Filter Toolbar (Matching Salestrail Screenshot) */}
        <div className="flex flex-wrap items-center space-x-6 text-xs font-semibold text-slate-700 pb-2">
          {/* Date Range Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-slate-900 font-bold text-sm">Date range</label>
            <div className="flex flex-wrap items-center gap-2">
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
                  <option value="Custom">Custom</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>

              {dateRange === 'Custom' && (
                <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                      title="Clear custom dates"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {isRecordingsOnly ? 'Audio Recordings' : 'Calls'}
          </h1>

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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
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
                {paginatedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500 font-medium">
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          <span>Syncing live call records from mobile...</span>
                        </div>
                      ) : (
                        <span>No {isRecordingsOnly ? 'recordings' : 'calls'} found matching filter. Make a call on your Android phone to log calls live!</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedCalls.map((call, idx) => {
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

                    const isAnswered = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
                    const effectiveDuration = isAnswered ? Number(call.durationSeconds || 0) : 0;
                    const durationMins = effectiveDuration > 0 ? Math.floor(effectiveDuration / 60) : 0;
                    const durationSecs = effectiveDuration > 0 ? effectiveDuration % 60 : 0;
                    const durationStr = isAnswered && effectiveDuration > 0
                      ? (durationMins > 0 ? `${durationMins}m:${durationSecs}s` : `${durationSecs}s`)
                      : '0s';

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

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-1 focus:outline-none shadow-xs cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
                <strong className="text-slate-900">{Math.min(currentPage * pageSize, totalRecords)}</strong> of{' '}
                <strong className="text-slate-900">{totalRecords}</strong> {isRecordingsOnly ? 'recordings' : 'calls'}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((pg) => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1)
                  .map((pg, i, arr) => {
                    const prevPg = arr[i - 1];
                    const showEllipsis = prevPg && pg - prevPg > 1;
                    return (
                      <React.Fragment key={pg}>
                        {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                        <button
                          onClick={() => setCurrentPage(pg)}
                          className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pg
                              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pg}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
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
