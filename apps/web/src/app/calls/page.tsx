'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { PhoneCall, Search, Filter, ShieldCheck, ShieldAlert, PlayCircle, Eye, MessageSquare, Smartphone } from 'lucide-react';

const mockCallsList = [
  {
    id: '65c1f0011122334455667788',
    agentName: 'Ananya Sharma',
    phoneMasked: '+91 ****** 5678',
    phoneUnmasked: '+91 98123 45678',
    leadName: 'Dr. Rajesh Kumar',
    leadId: 'PH-LEAD-8841',
    direction: 'OUTGOING',
    channel: 'CELLULAR',
    status: 'ANSWERED',
    startTime: '2026-08-07 16:30:15',
    duration: '06:24',
    disposition: 'Enrolled in NCLEX-RN Prep',
    recordingStatus: 'UPLOADED',
  },
  {
    id: '65c1f0021122334455667789',
    agentName: 'Ananya Sharma',
    phoneMasked: '+971 ****** 4567',
    phoneUnmasked: '+971 50 123 4567',
    leadName: 'Nurse Sunita Patel (Dubai)',
    leadId: 'PH-LEAD-8842',
    direction: 'INCOMING',
    channel: 'WHATSAPP',
    status: 'ANSWERED',
    startTime: '2026-08-07 15:12:00',
    duration: '04:05',
    disposition: 'Document Verification Sent (WhatsApp Call)',
    recordingStatus: 'UPLOADED',
  },
  {
    id: '65c1f0031122334455667790',
    agentName: 'Rahul Verma',
    phoneMasked: '+966 ****** 6543',
    phoneUnmasked: '+966 50 987 6543',
    leadName: 'Dr. Amit Shah (Riyadh)',
    leadId: 'PH-LEAD-8843',
    direction: 'OUTGOING',
    channel: 'WHATSAPP',
    status: 'ANSWERED',
    startTime: '2026-08-07 14:05:30',
    duration: '08:32',
    disposition: 'Fee Structure Discussion (WhatsApp Call)',
    recordingStatus: 'UPLOADED',
  },
  {
    id: '65c1f0041122334455667791',
    agentName: 'Rahul Verma',
    phoneMasked: '+91 ****** 8877',
    phoneUnmasked: '+91 98999 88877',
    leadName: 'Pharmacist Kavita Singh',
    leadId: 'PH-LEAD-8844',
    direction: 'OUTGOING',
    channel: 'CELLULAR',
    status: 'MISSED',
    startTime: '2026-08-07 12:45:00',
    duration: '00:00',
    disposition: 'Unanswered / Call Back Later',
    recordingStatus: 'NONE',
  },
  {
    id: '65c1f0051122334455667792',
    agentName: 'Priya Nair',
    phoneMasked: '+91 ****** 2233',
    phoneUnmasked: '+91 97111 22233',
    leadName: 'Dr. Meenakshi Sundaram',
    leadId: 'PH-LEAD-8845',
    direction: 'INCOMING',
    channel: 'CELLULAR',
    status: 'ANSWERED',
    startTime: '2026-08-07 11:20:10',
    duration: '06:50',
    disposition: 'Follow-up Call Scheduled',
    recordingStatus: 'UPLOADED',
  },
];

export default function CallsPage() {
  const [showPII, setShowPII] = useState(false);
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCalls = mockCallsList.filter((call) => {
    if (directionFilter !== 'ALL' && call.direction !== directionFilter) return false;
    if (channelFilter !== 'ALL' && call.channel !== channelFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        call.agentName.toLowerCase().includes(q) ||
        call.leadName.toLowerCase().includes(q) ||
        call.disposition.toLowerCase().includes(q)
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
                {filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-medium text-white">{call.agentName}</td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-200">{call.leadName}</p>
                      <p className="text-[10px] text-slate-400">{call.leadId}</p>
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-300">
                      {showPII ? call.phoneUnmasked : call.phoneMasked}
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
                        {call.direction}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-200">{call.startTime}</p>
                      <p className="text-[10px] font-mono text-slate-400">{call.duration}</p>
                    </td>
                    <td className="p-4 font-medium text-slate-300">{call.disposition}</td>
                    <td className="p-4">
                      {call.recordingStatus === 'UPLOADED' ? (
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
                        href={`/calls/${call.id}`}
                        className="inline-flex items-center space-x-1 bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white px-3 py-1.5 rounded text-xs font-semibold transition-all border border-brand-500/30"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Play Audio</span>
                      </Link>
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
