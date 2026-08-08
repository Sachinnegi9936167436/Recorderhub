'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Users, Plus, Edit2, Trash2, Mail, Key, UserCheck, RefreshCw, X, CheckCircle2, Shield } from 'lucide-react';

export default function CounselorsPage() {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COUNSELOR');
  const [password, setPassword] = useState('Password123!');

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4000/api/v1/auth/counselors');
      if (res.ok) {
        const data = await res.json();
        setCounselors(data || []);
      }
    } catch (err) {
      console.error('Error fetching counselors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounselors();
  }, []);

  const handleCreateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('http://localhost:4000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, role, pass: password }),
      });

      if (res.ok) {
        setToastMessage(`Successfully provisioned Counselor ID for ${firstName}!`);
        setIsCreateModalOpen(false);
        resetForm();
        fetchCounselors();
      } else {
        const errorData = await res.json();
        alert(`Failed to create counselor: ${errorData.message || 'Error occurred'}`);
      }
    } catch (err: any) {
      console.error('Error creating counselor:', err);
      alert(`Error connecting to API server: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounselor) return;
    try {
      setSubmitting(true);
      const res = await fetch(`http://localhost:4000/api/v1/auth/counselors/${editingCounselor._id || editingCounselor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, role }),
      });

      if (res.ok) {
        setToastMessage(`Updated role & details for ${firstName} ${lastName}!`);
        setEditingCounselor(null);
        resetForm();
        fetchCounselors();
      }
    } catch (err) {
      console.error('Error updating counselor:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCounselor = async (counselor: any) => {
    if (!confirm(`Are you sure you want to revoke and delete counselor ${counselor.firstName} ${counselor.lastName}?`)) return;
    try {
      const res = await fetch(`http://localhost:4000/api/v1/auth/counselors/${counselor._id || counselor.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setToastMessage(`Deleted counselor ID for ${counselor.firstName} ${counselor.lastName}`);
        fetchCounselors();
      }
    } catch (err) {
      console.error('Error deleting counselor:', err);
    }
  };

  const openEditModal = (counselor: any) => {
    setEditingCounselor(counselor);
    setFirstName(counselor.firstName || '');
    setLastName(counselor.lastName || '');
    setEmail(counselor.email || '');
    setRole(counselor.role || 'COUNSELOR');
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('COUNSELOR');
    setPassword('Password123!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Navigation />

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        {toastMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold">{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Counselor ID Directory</h1>
            <p className="text-sm text-slate-400">Admin Management Console • Provision, Update & Revoke Counselor Access</p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Counselor ID</span>
          </button>
        </div>

        {/* Counselors Table */}
        <div className="glass-panel overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Registered Counselors & Role Access</h3>
            <button
              onClick={fetchCounselors}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 px-3 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Directory</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-4">Counselor Name</th>
                  <th className="p-4">Email ID / Login</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Organization</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {counselors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {loading ? 'Loading directory...' : 'No counselors created yet. Click "+ Create New Counselor ID" above!'}
                    </td>
                  </tr>
                ) : (
                  counselors.map((c) => (
                    <tr key={c._id || c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-white">
                        {c.firstName} {c.lastName}
                      </td>
                      <td className="p-4 font-mono text-brand-400">{c.email}</td>
                      <td className="p-4">
                        <span className="bg-brand-600/10 text-brand-400 border border-brand-500/20 px-2.5 py-1 rounded text-[10px] font-bold">
                          {c.role || 'COUNSELOR'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">Academically Global</td>
                      <td className="p-4">
                        <span className="flex items-center space-x-1 text-emerald-400 text-[10px] font-bold">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="inline-flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-700 transition-all"
                        >
                          <Edit2 className="w-3 h-3 text-brand-400" />
                          <span>Edit Role</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCounselor(c)}
                          className="inline-flex items-center space-x-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1 rounded text-[11px] font-semibold border border-red-500/20 transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Counselor Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Counselor ID</h3>
                  <p className="text-xs text-slate-400">Provision credentials for mobile app login</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCounselor} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Counselor Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="ananya.sharma@academically.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role / Department Access</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="COUNSELOR">Counselor (NCLEX & DHA)</option>
                    <option value="TEAM_LEAD">Team Lead / Manager</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">App Login Password</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-lg shadow-brand-600/20"
                  >
                    {submitting ? 'Creating ID...' : 'Provision Counselor ID'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Counselor Modal */}
        {editingCounselor && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Update Counselor Role & Profile</h3>
                  <p className="text-xs text-slate-400">Modify role permissions or contact info</p>
                </div>
                <button onClick={() => setEditingCounselor(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateCounselor} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="COUNSELOR">Counselor (NCLEX & DHA)</option>
                    <option value="TEAM_LEAD">Team Lead / Manager</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingCounselor(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-lg shadow-brand-600/20"
                  >
                    {submitting ? 'Saving Changes...' : 'Update Role & Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
