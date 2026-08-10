'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Navigation } from '@/components/Navigation';
import { useSearchParams } from 'next/navigation';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  UserCheck, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  Search, 
  ChevronDown, 
  User, 
  ArrowUpDown, 
  ArrowDown,
  Info
} from 'lucide-react';

function CounselorsAndTeamsInner() {
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'teams';

  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'current' | 'invited'>('current');
  const [editingCounselor, setEditingCounselor] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Teams State (Starts empty - teams added dynamically by user)
  const [teamsList, setTeamsList] = useState<any[]>([]);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamAdmin, setNewTeamAdmin] = useState('');
  const [newTeamAppCount, setNewTeamAppCount] = useState('5 / 5');

  // Filters for Teams
  const [teamRoleFilter, setTeamRoleFilter] = useState('Your team role');
  const [teamStatusFilter, setTeamStatusFilter] = useState('Status');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Form State for User Management
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COUNSELOR');
  const [password, setPassword] = useState('Password123!');

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/auth/counselors', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCounselors(Array.isArray(data) ? data : []);
      } else {
        setCounselors([]);
      }
    } catch (err) {
      console.error('Error fetching counselors:', err);
      setCounselors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounselors();
  }, []);

  const getCounselorId = (counselor: any) => {
    if (!counselor) return '';
    if (counselor.email) return counselor.email;
    if (typeof counselor._id === 'string') return counselor._id;
    if (counselor._id?.$oid) return counselor._id.$oid;
    if (counselor._id?.toString) return counselor._id.toString();
    return counselor.id || '';
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const newTeam = {
      id: `t-${Date.now()}`,
      name: newTeamName.trim(),
      admin: newTeamAdmin.trim() || 'Mohammed Ayaan',
      installedRatio: newTeamAppCount || '1 / 1',
      members: ['Nasreen', 'Vasantha', 'Manas Vikas'],
      admins: [newTeamAdmin.trim() || 'Mohammed Ayaan']
    };
    setTeamsList([newTeam, ...teamsList]);
    setToastMessage(`Successfully created team "${newTeam.name}"!`);
    setIsAddTeamModalOpen(false);
    setNewTeamName('');
    setNewTeamAdmin('');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRemoveMemberFromTeam = (memberName: string) => {
    if (!selectedTeam) return;
    const updatedMembers = selectedTeam.members.filter((m: string) => m !== memberName);
    const updatedTeam = { ...selectedTeam, members: updatedMembers };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t)));
    setToastMessage(`Removed ${memberName} from ${selectedTeam.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveAdminFromTeam = (adminName: string) => {
    if (!selectedTeam) return;
    const updatedAdmins = selectedTeam.admins.filter((a: string) => a !== adminName);
    const updatedTeam = { ...selectedTeam, admins: updatedAdmins };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t)));
    setToastMessage(`Removed admin ${adminName} from ${selectedTeam.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddUserToTeam = () => {
    if (!selectedTeam) return;
    const availableNames = counselors.map((m: any) => m.firstName || m.email || 'Counselor');
    const newMember = availableNames.find((n: string) => !selectedTeam.members.includes(n)) || `User ${selectedTeam.members.length + 1}`;
    const updatedMembers = [...selectedTeam.members, newMember];
    const updatedTeam = { ...selectedTeam, members: updatedMembers, installedRatio: `${updatedMembers.length} / ${updatedMembers.length}` };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t)));
    setToastMessage(`Added ${newMember} to ${selectedTeam.name}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const newEntry = {
        _id: `c-${Date.now()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role: role,
      };

      setCounselors((prev) => [newEntry, ...prev.filter((item) => item.email !== newEntry.email)]);
      setToastMessage(`Successfully provisioned Counselor ID for ${firstName}!`);
      setIsCreateModalOpen(false);
      resetForm();

      await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, role, pass: password }),
      });
    } catch (err: any) {
      console.error('Error creating counselor:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounselor) return;
    const targetId = getCounselorId(editingCounselor);

    setCounselors((prev) =>
      prev.map((item) => {
        if (getCounselorId(item) === targetId || item.email === editingCounselor.email) {
          return {
            ...item,
            firstName: firstName.trim() || item.firstName,
            lastName: lastName.trim() || item.lastName,
            email: email.trim().toLowerCase() || item.email,
            role: role || item.role,
          };
        }
        return item;
      })
    );

    setToastMessage(`Updated role & details for ${firstName || email}!`);
    setEditingCounselor(null);
    resetForm();

    try {
      await fetch(`/api/v1/auth/counselors?id=${encodeURIComponent(targetId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, role }),
      });
    } catch (err: any) {
      console.error('Error updating counselor:', err);
    }
  };

  const handleDeleteCounselor = async (counselor: any) => {
    const targetId = getCounselorId(counselor);
    const displayName = (counselor.firstName || counselor.email || 'Counselor').trim();
    if (!confirm(`Are you sure you want to revoke and delete counselor ${displayName}?`)) return;

    setCounselors((prev) =>
      prev.filter((item) => getCounselorId(item) !== targetId && item.email !== counselor.email)
    );

    setToastMessage(`Deleted counselor ID for ${displayName}`);

    try {
      await fetch(`/api/v1/auth/counselors?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
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

  const filteredTeams = teamsList.filter((t) =>
    t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    t.admin.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <Navigation />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto">
        {/* Top Notification Toast */}
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-semibold">{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

        {/* VIEW 1: TEAMS (Team Management) */}
        {currentView === 'teams' ? (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Teams</h1>

            {/* Primary Action Button: + Add team */}
            <div>
              <button
                onClick={() => setIsAddTeamModalOpen(true)}
                className="inline-flex items-center space-x-3 bg-[#242938] hover:bg-[#1a1e29] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md"
              >
                <div className="w-5 h-5 rounded-full border-2 border-white/80 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
                <span>Add team</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <span className="text-slate-400 text-lg">≡</span>
                  <span>Filter teams where you</span>
                </div>

                <div className="relative">
                  <select
                    value={teamRoleFilter}
                    onChange={(e) => setTeamRoleFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 shadow-sm focus:outline-none"
                  >
                    <option>Your team role</option>
                    <option>Team Admin</option>
                    <option>Member</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={teamStatusFilter}
                    onChange={(e) => setTeamStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 shadow-sm focus:outline-none"
                  >
                    <option>Status</option>
                    <option>Active</option>
                    <option>Archived</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Search Box */}
              <div className="relative w-full max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search"
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Teams Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-800">
                  <thead className="bg-white text-slate-900 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-4 pl-12 font-bold w-1/3">
                        <div className="flex items-center justify-center space-x-1">
                          <span>Team</span>
                          <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                        </div>
                      </th>
                      <th className="p-4 font-bold text-center w-1/3">
                        <div className="flex items-center justify-center space-x-1">
                          <span>Team admins</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-4 pr-12 font-bold text-center w-1/3">
                        <div className="flex items-center justify-center space-x-1">
                          <span>App installed</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTeams.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-slate-500 font-medium">
                          No teams created yet. Click <span className="font-bold text-slate-800">"+ Add team"</span> above to create your first team!
                        </td>
                      </tr>
                    ) : (
                      filteredTeams.map((t) => (
                        <tr 
                          key={t.id} 
                          onClick={() => setSelectedTeam(t)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="p-5 pl-12 font-semibold text-slate-900 text-center">{t.name}</td>
                          <td className="p-5 text-center text-slate-800 font-medium">{t.admin}</td>
                          <td className="p-5 text-center font-semibold text-slate-900 pr-12">{t.installedRatio}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: USER MANAGEMENT (Counselor Directory) */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
                <p className="text-xs text-slate-500 mt-1">Admin Console • Provision, Update & Revoke Counselor Credentials</p>
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center space-x-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-rose-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Counselor ID</span>
              </button>
            </div>

            {/* Counselors Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Registered Counselors & Role Access</h3>
                <button
                  onClick={fetchCounselors}
                  className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-1.5 rounded-lg transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Directory</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-4">Counselor Name</th>
                      <th className="p-4">Email ID / Login</th>
                      <th className="p-4">Assigned Role</th>
                      <th className="p-4">Organization</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {counselors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                          {loading ? 'Loading directory...' : 'No counselors registered yet. Click "+ Create New Counselor ID" above to provision a counselor!'}
                        </td>
                      </tr>
                    ) : (
                      counselors.map((c) => (
                      <tr key={c._id || c.email || c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">
                          {c.firstName || 'Counselor'} {c.lastName || ''}
                        </td>
                        <td className="p-4 font-mono text-slate-800">{c.email}</td>
                        <td className="p-4">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[10px] font-bold">
                            {c.role || 'COUNSELOR'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">Academically Global</td>
                        <td className="p-4">
                          <span className="inline-flex items-center space-x-1 text-emerald-600 text-[10px] font-bold">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="inline-flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-white" />
                            <span>Edit Role</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCounselor(c)}
                            className="inline-flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
          </div>
        )}

        {/* SLIDE-OVER DRAWER: Team Details (Matches User Screenshot) */}
        {selectedTeam && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex justify-end">
            <div className="bg-white w-full max-w-lg h-full p-8 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedTeam.name}</h2>
                  <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-slate-900 p-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-end space-x-6 border-b border-slate-100 pb-2 text-sm">
                  <button
                    onClick={() => setActiveDrawerTab('current')}
                    className={`font-bold pb-2 border-b-2 transition-all ${
                      activeDrawerTab === 'current'
                        ? 'text-slate-900 border-[#ff5c75]'
                        : 'text-slate-400 border-transparent hover:text-slate-700'
                    }`}
                  >
                    Current user
                  </button>
                  <button
                    onClick={() => setActiveDrawerTab('invited')}
                    className={`font-bold pb-2 border-b-2 transition-all ${
                      activeDrawerTab === 'invited'
                        ? 'text-slate-900 border-[#ff5c75]'
                        : 'text-slate-400 border-transparent hover:text-slate-700'
                    }`}
                  >
                    Invited users
                  </button>
                </div>

                {/* Team Members List Section */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-sm font-bold text-slate-900">
                    <span>Team members</span>
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {selectedTeam.members && selectedTeam.members.length > 0 ? (
                      selectedTeam.members.map((member: string, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3.5 text-sm text-slate-800 font-medium hover:bg-slate-50 transition-colors">
                          <span>{member}</span>
                          <button 
                            onClick={() => handleRemoveMemberFromTeam(member)}
                            className="text-rose-400 hover:text-rose-600 font-bold p-1 rounded-full hover:bg-rose-50"
                          >
                            <X className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-xs text-slate-400 text-center">No members in this team yet.</div>
                    )}
                  </div>
                </div>

                {/* Team Admins Section */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center space-x-1.5 text-sm font-bold text-slate-900">
                    <span>Team admins</span>
                    <Info className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3.5 divide-y divide-slate-100">
                    {selectedTeam.admins && selectedTeam.admins.length > 0 ? (
                      selectedTeam.admins.map((admin: string, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-1 text-sm text-slate-800 font-medium">
                          <span>{admin}</span>
                          <button 
                            onClick={() => handleRemoveAdminFromTeam(admin)}
                            className="text-rose-400 hover:text-rose-600 font-bold p-1 rounded-full hover:bg-rose-50"
                          >
                            <X className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400">Mohammed Ayaan</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Button: Add users */}
              <div className="pt-6">
                <button
                  onClick={handleAddUserToTeam}
                  className="w-full bg-[#ff5c75] hover:bg-[#ef4c65] text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all text-center"
                >
                  Add users
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 1: Add Team Modal */}
        {isAddTeamModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add New Team</h3>
                  <p className="text-xs text-slate-500">Create a regional counselor team</p>
                </div>
                <button onClick={() => setIsAddTeamModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Team Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dehradun Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Team Admin</label>
                  <input
                    type="text"
                    placeholder="e.g. Mohammed Ayaan"
                    value={newTeamAdmin}
                    onChange={(e) => setNewTeamAdmin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">App Installation Ratio</label>
                  <input
                    type="text"
                    value={newTeamAppCount}
                    onChange={(e) => setNewTeamAppCount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddTeamModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#242938] hover:bg-[#1a1e29] text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md"
                  >
                    Create Team
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Create Counselor Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create New Counselor ID</h3>
                  <p className="text-xs text-slate-500">Provision credentials for mobile app login</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCounselor} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ananya@academically.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="COUNSELOR">Counselor (NCLEX & DHA)</option>
                    <option value="TEAM_LEAD">Team Lead / Manager</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md shadow-rose-500/20"
                  >
                    {submitting ? 'Creating ID...' : 'Provision Counselor ID'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Edit Counselor Modal */}
        {editingCounselor && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Update Counselor Role & Profile</h3>
                  <p className="text-xs text-slate-500">Modify role permissions or contact info</p>
                </div>
                <button onClick={() => setEditingCounselor(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateCounselor} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md"
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

export default function CounselorsAndTeamsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans"><main className="flex-1 p-8">Loading teams...</main></div>}>
      <CounselorsAndTeamsInner />
    </Suspense>
  );
}
