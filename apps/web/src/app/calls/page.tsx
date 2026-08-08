'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { 
  PhoneCall, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  PlayCircle, 
  Eye, 
  MessageSquare, 
  Smartphone, 
  RefreshCw,
  Download,
  ChevronDown,
  User
} from 'lucide-react';

export default function SalestrailCallsPage() {
  const [callsList, setCallsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPII, setShowPII] = useState(true);
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCalls = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredCalls = callsList.filter((call) => {
    const phone = call.phoneNumber || call.phoneNumberMasked || '';
    const agent = call.agentName || call.deviceId || '';
    const matchesSearch = phone.toLowerCase().includes(searchQuery.toLowerCase()) || agent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDir = directionFilter === 'ALL' || (call.direction || '').toUpperCase() === directionFilter;
    const matchesChan = channelFilter === 'ALL' || (call.channel || 'CELLULAR').toUpperCase() === channelFilter;

    return matchesSearch && matchesDir && matchesChan;
  });

  const exportCSV = () => {
    if (callsList.length === 0) {
      alert('No call records available to export.');
      return;
    }
    const headers = ['Counselor', 'PhoneNumber', 'Direction', 'Status', 'DurationSec', 'Date'];
    const rows = callsList.map((c) => [
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
    link.setAttribute('download', `RecorderHub_Call_Logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Navigation />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between pb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Call Audit Log & Recordings</h1>
            <p className="text-xs text-slate-500 mt-1">Real-time mobile SIM & WhatsApp call tracking from counselor devices</p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPII(!showPII)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                showPII
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {showPII ? <ShieldAlert className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-slate-500" />}
              <span>{showPII ? 'Hide PII Numbers' : 'Show Unmasked Numbers'}</span>
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center space-x-2 bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export as CSV</span>
            </button>

            <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
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

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search phone number or counselor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex items-center space-x-6 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-700">Direction:</span>
              {['ALL', 'INCOMING', 'OUTGOING'].map((dir) => (
                <button
                  key={dir}
                  onClick={() => setDirectionFilter(dir)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    directionFilter === dir
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calls Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Counselor</th>
                  <th className="p-4">Prospect / Lead</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Channel</th>
                  <th className="p-4">Direction</th>
                  <th className="p-4">Time & Duration</th>
                  <th className="p-4">Disposition</th>
                  <th className="p-4">Recording</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500">
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          <span>Fetching live call records from MongoDB Atlas...</span>
                        </div>
                      ) : (
                        <span>No call events recorded yet. Make a call on your Android phone to sync live!</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const rawPhone = call.phoneNumber || call.phoneNumberMasked || call.phone || '';
                    const maskedPhone = rawPhone.length > 5
                      ? rawPhone.substring(0, 4) + ' **** ' + rawPhone.substring(rawPhone.length - 4)
                      : rawPhone || 'Unknown Number';
                    const startTimeStr = call.startTime ? new Date(call.startTime).toLocaleString() : 'Just Now';
                    const durationStr = call.durationSeconds ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : '0s';

                    return (
                      <tr key={call.id || call._id || call.idempotencyKey} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{call.agentName || call.deviceId || 'Counselor Agent'}</td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">{call.leadName || 'Inbound Prospect'}</p>
                          <p className="text-[10px] text-slate-400">{call.leadId || 'PH-LIVE-LEAD'}</p>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {showPII ? (rawPhone || 'N/A') : maskedPhone}
                        </td>
                        <td className="p-4">
                          {call.channel === 'WHATSAPP' ? (
                            <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-bold">
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-md text-[10px] font-bold">
                              <Smartphone className="w-3 h-3" />
                              <span>SIM Call</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold ${
                              (call.direction || '').toUpperCase() === 'OUTGOING'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {call.direction || 'INCOMING'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">{startTimeStr}</p>
                          <p className="text-[11px] font-mono text-slate-500">{durationStr}</p>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{call.disposition || 'Imported Phone Call'}</td>
                        <td className="p-4">
                          {call.recordingStatus === 'COMPLETED' || call.audioUrl ? (
                            <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-md text-[10px] font-bold">
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>Cloud Audio</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No Recording</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/calls/${call.id || call._id}`}
                            className="inline-flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border border-rose-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Play Audio</span>
                          </Link>
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
