'use client';

import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Settings, ShieldCheck, Database, Award, Save, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [crmUrl, setCrmUrl] = useState('https://api.pharmlly.com/v1');
  const [retentionDays, setRetentionDays] = useState(180);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Navigation />

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organization Settings & Policies</h1>
          <p className="text-sm text-slate-400">Configure Pharmlly CRM integration, weighted QA rubrics, and data retention limits</p>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pharmlly CRM Configuration */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Database className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-bold text-white">Pharmlly CRM Adapter Settings</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Pharmlly Base API URL</label>
                <input
                  type="text"
                  value={crmUrl}
                  onChange={(e) => setCrmUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">E.164 Phone Normalization Default</label>
                <input
                  type="text"
                  value="+91 (India)"
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-slate-400"
                />
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-1">
                <p className="font-semibold text-emerald-400">Outbox Retry Strategy Active</p>
                <p className="text-slate-400 text-[11px]">Exponential backoff at 1m, 5m, 15m, 1h, 6h. Failures route to Manager Repair Queue.</p>
              </div>
            </div>
          </div>

          {/* QA Weighted Rubric Settings */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Weighted QA Scoring Rubric</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-200">Greeting & Mandatory Disclosure</span>
                <span className="font-bold text-brand-400">10 Points</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-200">Rapport & Healthcare Empathy</span>
                <span className="font-bold text-brand-400">20 Points</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-200">Program / Exam Accuracy</span>
                <span className="font-bold text-brand-400">25 Points</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-200">Objection Handling & Fee Structure</span>
                <span className="font-bold text-brand-400">25 Points</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-200">Clear Closing & Next Step</span>
                <span className="font-bold text-brand-400">20 Points</span>
              </div>
            </div>
          </div>

          {/* Data Retention & S3 Policy */}
          <div className="lg:col-span-2 glass-panel p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Data Retention & Encryption Policies</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">S3 Audio Recording Retention (Days)</label>
                <input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Transcript & AI Analysis Retention</label>
                <input
                  type="text"
                  value="365 Days (Automated TTL)"
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-lg text-xs transition-all flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Organization Policies</span>
              </button>

              {saved && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Settings saved successfully!</span>
                </span>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
