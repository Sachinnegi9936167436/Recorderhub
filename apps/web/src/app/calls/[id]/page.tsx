'use client';

import React, { useState } from 'react';
import Navigation from '@/components/Navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Pause, Volume2, ShieldCheck, Check, MessageSquare, Smartphone, Clock, Calendar, User, PhoneCall } from 'lucide-react';

export default function CallDetailPage({ params }: { params: { id: string } }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [disposition, setDisposition] = useState('Enrolled in NCLEX-RN Prep');
  const [coachingNote, setCoachingNote] = useState('Counselor confirmed course eligibility credentials timeline.');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isWhatsApp = params.id.endsWith('2') || params.id.endsWith('3') || params.id.endsWith('89') || params.id.endsWith('90');

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Navigation />

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        {/* Top Breadcrumb & Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/calls"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Calls Explorer</span>
          </Link>

          <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            Call ID: {params.id.slice(0, 14)}...
          </span>
        </div>

        {/* Call Summary Banner */}
        <div className="glass-panel p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isWhatsApp ? 'Nurse Sunita Patel (Dubai)' : 'Dr. Rajesh Kumar'}
              </h1>
              {isWhatsApp ? (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded text-xs font-bold flex items-center space-x-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WHATSAPP CALL</span>
                </span>
              ) : (
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded text-xs font-bold flex items-center space-x-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>SIM CALL</span>
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300">Counselor: <span className="text-white font-semibold">Ananya Sharma</span> • NCLEX-RN Admissions Team</p>
            <p className="text-xs text-slate-400">Phone: +91 ****** 5678 • 2026-08-07 16:30:15 IST • Duration: 06m 24s</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center space-x-4 shrink-0">
            <ShieldCheck className="w-8 h-8 text-teal-400" />
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Pharmlly CRM Status</p>
              <p className="text-sm font-bold text-emerald-400">Synced to Lead Record</p>
            </div>
          </div>
        </div>

        {/* Audio Waveform Player */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white">Call Audio Recording</h3>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              AWS S3 Direct Audio Stream
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Waveform Visualization */}
            <div className="flex-1 space-y-2">
              <div className="flex items-end space-x-1 h-10 px-2">
                {Array.from({ length: 48 }).map((_, idx) => {
                  const heights = [20, 45, 70, 30, 85, 60, 95, 40, 65, 30, 90, 50, 75, 25, 60, 80];
                  const height = heights[idx % heights.length];
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-full transition-all ${
                        idx < 18 ? 'bg-brand-500' : 'bg-slate-800'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>02:18</span>
                <span>06:24</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details & Notes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Call Metadata & Details</h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Channel Type</span>
                  <p className="text-white font-semibold flex items-center space-x-1">
                    {isWhatsApp ? <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> : <Smartphone className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{isWhatsApp ? 'WhatsApp Call (Speaker Mic)' : 'Cellular SIM Call'}</span>
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Lead Record ID</span>
                  <p className="text-white font-mono font-semibold">PH-LEAD-8841</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Call Start Time</span>
                  <p className="text-white font-semibold">2026-08-07 16:30:15 IST</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium">Total Duration</span>
                  <p className="text-white font-mono font-semibold">06 Minutes 24 Seconds</p>
                </div>
              </div>
            </div>
          </div>

          {/* Disposition & Notes Form */}
          <div className="space-y-6">
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Call Disposition & Notes</h3>

              <form onSubmit={handleSaveNotes} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Call Disposition</label>
                  <select
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Enrolled in NCLEX-RN Prep">Enrolled in NCLEX-RN Prep</option>
                    <option value="Document Verification Sent">Document Verification Sent</option>
                    <option value="Fee Structure Discussion">Fee Structure Discussion</option>
                    <option value="Follow-up Call Scheduled">Follow-up Call Scheduled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Manager Note</label>
                  <textarea
                    rows={4}
                    value={coachingNote}
                    onChange={(e) => setCoachingNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Call Record</span>
                </button>

                {savedSuccess && (
                  <p className="text-center text-emerald-400 font-semibold flex items-center justify-center space-x-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Call record updated!</span>
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
