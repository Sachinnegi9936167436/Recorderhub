'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  Download, 
  FileCode2, 
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface ApkRelease {
  _id: string;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  fileSizeBytes: number;
  releaseNotes: string;
  isForced: boolean;
  minSupportedVersionCode: number;
  isActive: boolean;
  uploadedBy: string;
  createdAt: string;
}

interface ApkReleaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReleaseUpdated?: () => void;
}

export function ApkReleaseManagerModal({ isOpen, onClose, onReleaseUpdated }: ApkReleaseManagerModalProps) {
  const [releases, setReleases] = useState<ApkRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [isForced, setIsForced] = useState(false);
  const [minSupportedVersionCode, setMinSupportedVersionCode] = useState('1');

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/app/releases', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setReleases(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching releases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReleases();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Try to parse version from filename like RecordHub-v1.0.9-109.apk or RecordHub-v1.0.9.apk
      const match = file.name.match(/v?(\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?)/i);
      if (match && !versionName) {
        setVersionName(match[1]);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedFile) {
      setErrorMsg('Please select an APK file to upload.');
      return;
    }
    if (!versionName.trim()) {
      setErrorMsg('Please enter a Version Name (e.g. 1.0.9).');
      return;
    }
    if (!versionCode.trim() || isNaN(Number(versionCode))) {
      setErrorMsg('Please enter a valid numeric Version Code (e.g. 109).');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('versionName', versionName.trim());
      formData.append('versionCode', versionCode.trim());
      formData.append('releaseNotes', releaseNotes.trim());
      formData.append('isForced', isForced ? 'true' : 'false');
      formData.append('minSupportedVersionCode', minSupportedVersionCode.trim() || '1');
      formData.append('uploadedBy', localStorage.getItem('userEmail') || 'Admin');

      const res = await fetch('/api/v1/app/releases', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload release');
      }

      setSuccessMsg(`Successfully published APK v${versionName} (Build ${versionCode})!`);
      setSelectedFile(null);
      setVersionName('');
      setVersionCode('');
      setReleaseNotes('');
      setIsForced(false);
      await fetchReleases();
      if (onReleaseUpdated) onReleaseUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error publishing release');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, verName: string) => {
    if (!confirm(`Are you sure you want to delete release v${verName}?`)) return;
    try {
      const res = await fetch(`/api/v1/app/releases?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg(`Deleted release v${verName}`);
        await fetchReleases();
        if (onReleaseUpdated) onReleaseUpdated();
      }
    } catch (err) {
      setErrorMsg('Error deleting release');
    }
  };

  const handleToggleForced = async (release: ApkRelease) => {
    try {
      const res = await fetch('/api/v1/app/releases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: release._id,
          isForced: !release.isForced,
        }),
      });
      if (res.ok) {
        await fetchReleases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Android APK Auto-Update Manager</span>
                <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  OTA Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload new APK builds. Android devices will automatically detect and install updates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Upload Form Card */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <UploadCloud className="w-4 h-4 text-rose-600" />
                <span>Publish New APK Release</span>
              </h3>
              <span className="text-[11px] text-slate-400">AWS S3 Over-The-Air Storage</span>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* APK File Picker */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    APK File (.apk) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-rose-400 bg-white rounded-xl p-4 text-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept=".apk,application/vnd.android.package-archive"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <FileCode2 className="w-6 h-6 text-slate-400" />
                      <p className="text-xs font-medium text-slate-700">
                        {selectedFile ? (
                          <span className="font-bold text-rose-600">{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        ) : (
                          <span>Click to browse or drag & drop <strong className="text-slate-900">RecordHub.apk</strong></span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Version Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Version Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.0.9"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Displayed to users (e.g. 1.0.9-prod)</p>
                </div>

                {/* Version Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Version Code (Build No.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 109"
                    value={versionCode}
                    onChange={(e) => setVersionCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Must be higher than current code (e.g. 108)</p>
                </div>

                {/* Mandatory / Force Update Toggle */}
                <div className="flex flex-col justify-center">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mandatory Update
                  </label>
                  <label className="inline-flex items-center space-x-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isForced}
                      onChange={(e) => setIsForced(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Force users to update before use
                    </span>
                  </label>
                </div>
              </div>

              {/* Release Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Release Notes / Changelog
                </label>
                <textarea
                  rows={2}
                  placeholder="• Fixed WhatsApp call auto-detection&#10;• Improved battery life and audio sync"
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading to S3 & Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Publish & Push Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Releases Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Published Release History ({releases.length})
              </h3>
              <button
                onClick={fetchReleases}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">VERSION</th>
                    <th className="py-3 px-4">BUILD CODE</th>
                    <th className="py-3 px-4">SIZE</th>
                    <th className="py-3 px-4">FORCE UPDATE</th>
                    <th className="py-3 px-4">RELEASE DATE</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {releases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        No APK releases published yet. Use the form above to publish your first update.
                      </td>
                    </tr>
                  ) : (
                    releases.map((rel, idx) => (
                      <tr key={rel._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <span>v{rel.versionName}</span>
                            {idx === 0 && (
                              <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold px-2 py-0.2 rounded-full uppercase">
                                Active / Latest
                              </span>
                            )}
                          </div>
                          {rel.releaseNotes && (
                            <p className="text-[11px] text-slate-500 font-normal mt-0.5 line-clamp-1">
                              {rel.releaseNotes}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">{rel.versionCode}</td>
                        <td className="py-3.5 px-4 text-slate-500">{formatBytes(rel.fileSizeBytes)}</td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleForced(rel)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                              rel.isForced
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span>{rel.isForced ? 'Mandatory' : 'Optional'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {rel.createdAt ? new Date(rel.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={rel.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Download APK"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleDelete(rel._id, rel.versionName)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Release"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Android App auto-sync endpoint: <code className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">/api/v1/app/check-update</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 rounded-xl transition-all shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
