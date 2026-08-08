'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { PhoneCall, Search, Filter, ShieldCheck, ShieldAlert, PlayCircle, Eye, MessageSquare, Smartphone, RefreshCw } from 'lucide-react';

export default function CallsPage() {
  const [callsList, setCallsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPII, setShowPII] = useState(false);
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCalls = async () => {
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
    if (directionFilter !== 'ALL' && call.direction !== directionFilter) return false;
    if (channelFilter !== 'ALL' && (call.channel || 'CELLULAR') !== channelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (call.agentName || call.deviceId || '').toLowerCase().includes(q) ||
        (call.phoneNumber || '').toLowerCase().includes(q) ||
        (call.disposition || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Navigation />

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Calls Explorer</h1>
            <p className="text-sm text-slate-400">Search, filter, and listen to SIM & WhatsApp call recordings</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPII(!showPII)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                showPII
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {showPII ? <ShieldAlert className="w-4 h-4 text-amber-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
              <span>{showPII ? 'PII Unmasked (Admin Mode)' : 'Mask Phone Numbers (Safe Mode)'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search counselor, prospect, disposition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Channel:</span>
              {['ALL', 'CELLULAR', 'WHATSAPP'].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    channelFilter === ch
                      ? ch === 'WHATSAPP'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-brand-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {ch === 'CELLULAR' ? 'SIM Call' : ch === 'WHATSAPP' ? 'WhatsApp' : 'All Channels'}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5 border-l border-slate-800 pl-3">
              <span className="text-xs text-slate-400 font-medium">Direction:</span>
              {['ALL', 'INCOMING', 'OUTGOING'].map((dir) => (
                <button
                  key={dir}
                  onClick={() => setDirectionFilter(dir)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    directionFilter === dir
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {dir}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calls Table */}
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                          <span>Fetching live call records from MongoDB...</span>
                        </div>
                      ) : (
                        <span>No call events synced to MongoDB yet. Make a work call on your Android phone!</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const maskedPhone = (call.phoneNumber || '').replace(/(\+\d{2}\s?\d{2})\d{4}(\d{4})/, '$1 **** $2');
                    const startTimeStr = call.startTime ? new Date(call.startTime).toLocaleString() : 'Just Now';
                    const durationStr = call.durationSeconds ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : '0s';

                    return (
                      <tr key={call.id || call._id || call.idempotencyKey} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-medium text-white">{call.agentName || call.deviceId || 'Counselor Agent'}</td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-200">{call.leadName || 'Inbound Prospect'}</p>
                          <p className="text-[10px] text-slate-400">{call.leadId || 'PH-LIVE-LEAD'}</p>
                        </td>
                        <td className="p-4 font-mono font-medium text-slate-300">
                          {showPII ? call.phoneNumber : maskedPhone}
                        </td>
                        <td className="p-4">
                          {call.channel === 'WHATSAPP' ? (
                            <span className="inline-flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[10px] font-bold">
                              <MessageSquare className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-bold">
                              <Smartphone className="w-3 h-3" />
                              <span>SIM Call</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-bold ${
                              call.direction === 'OUTGOING'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {call.direction || 'INCOMING'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-200">{startTimeStr}</p>
                          <p className="text-[10px] font-mono text-slate-400">{durationStr}</p>
                        </td>
                        <td className="p-4 font-medium text-slate-300">{call.disposition || 'New Lead Inquiry'}</td>
                        <td className="p-4">
                          {call.recordingStatus === 'UPLOADED' || call.recordingPath ? (
                            <span className="flex items-center space-x-1.5 text-teal-400 bg-teal-500/10 px-2 py-1 rounded text-[10px] font-medium border border-teal-500/20">
                              <PlayCircle className="w-3.5 h-3.5" />
                              <span>S3 Audio</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No Recording</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/calls/${call.id || call._id}`}
                            className="inline-flex items-center space-x-1 bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white px-3 py-1.5 rounded text-xs font-semibold transition-all border border-brand-500/30"
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
