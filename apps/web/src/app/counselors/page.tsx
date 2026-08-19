'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Navigation, useUserRole } from '@/components/Navigation';
import { UserProfileMenu } from '@/components/UserProfileMenu';
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
  const { role: userRole, email: userEmail, isAdmin, isManager, isCounselor } = useUserRole();
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

  // Initial Teams default preset
  const defaultInitialTeams = [
    {
      id: 't-1',
      name: 'Global Sales',
      admin: 'Sachin Negi',
      installedRatio: '3 / 3',
      members: ['Nasreen', 'Vasantha', 'Manas Vikas'],
      admins: ['Sachin Negi']
    },
    {
      id: 't-2',
      name: 'NCLEX Counselors',
      admin: 'Rajdeep',
      installedRatio: '2 / 2',
      members: ['Ananya Sharma', 'Rahul Kumar'],
      admins: ['Rajdeep']
    },
    {
      id: 't-3',
      name: 'DHA Counselors',
      admin: 'Dev',
      installedRatio: '2 / 2',
      members: ['Vasantha', 'Nasreen'],
      admins: ['Dev']
    }
  ];

  // Teams State (Persisted in localStorage)
  const [teamsList, setTeamsList] = useState<any[]>([]);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamAdmin, setNewTeamAdmin] = useState('Sachin Negi');
  const [newTeamAppCount, setNewTeamAppCount] = useState('5 / 5');
  const [newTeamSelectedMembers, setNewTeamSelectedMembers] = useState<string[]>([]);
  const [counselorSearchInModal, setCounselorSearchInModal] = useState('');

  // Team Leads Dropdown Options (Strictly TEAM_LEAD, MANAGER, or ADMIN roles)
  const teamLeadsOptions = React.useMemo(() => {
    const leads = counselors
      .filter((c) => {
        const roleUpper = (c.role || '').toUpperCase();
        return roleUpper === 'TEAM_LEAD' || roleUpper === 'MANAGER' || roleUpper === 'ADMIN' || roleUpper === 'COMPANY_ADMIN';
      })
      .map((c) => `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email?.split('@')[0])
      .filter(Boolean);

    if (leads.length > 0) {
      return Array.from(new Set(leads));
    }

    // Default Team Leads fallback (Excludes regular Counselors)
    return ['Sachin Negi', 'Rajdeep', 'Dev admin'];
  }, [counselors]);

  // Counselor Selection for Active Team Modal
  const [isAddCounselorModalOpen, setIsAddCounselorModalOpen] = useState(false);
  const [selectedCounselorsToAdd, setSelectedCounselorsToAdd] = useState<string[]>([]);
  const [addCounselorSearchQuery, setAddCounselorSearchQuery] = useState('');

  // Filters for Teams
  const [teamRoleFilter, setTeamRoleFilter] = useState('Your team role');
  const [teamStatusFilter, setTeamStatusFilter] = useState('Status');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Form State for User Management
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('COUNSELOR');
  const [password, setPassword] = useState('Academically@01');

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/auth/counselors', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCounselors((prev) => {
          const fetched = Array.isArray(data) ? data : [];
          // Merge with any local counselors created in User Management
          const map = new Map();
          fetched.forEach((item) => map.set(item.email, item));
          prev.forEach((item) => {
            if (!map.has(item.email)) map.set(item.email, item);
          });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Error fetching counselors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounselors();
    if (typeof window !== 'undefined') {
      const savedCounselors = localStorage.getItem('recorderhub_counselors');
      if (savedCounselors) {
        try {
          const parsedC = JSON.parse(savedCounselors);
          if (Array.isArray(parsedC) && parsedC.length > 0) {
            setCounselors((prev) => {
              const combined = [...prev];
              parsedC.forEach((pc) => {
                if (!combined.some((c) => c.email === pc.email)) {
                  combined.push(pc);
                }
              });
              return combined;
            });
          }
        } catch (e) {
          console.error(e);
        }
      }

      const saved = localStorage.getItem('recorderhub_teams');
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setTeamsList(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved teams:', e);
        }
      }
      setTeamsList(defaultInitialTeams);
    }
  }, []);

  const getAvailableCounselorObjects = () => {
    const map = new Map<string, { name: string; email: string; role: string }>();
    counselors.forEach((c) => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Counselor';
      if (fullName) {
        map.set(fullName.toLowerCase(), {
          name: fullName,
          email: c.email || '',
          role: c.role || 'COUNSELOR'
        });
      }
    });
    return Array.from(map.values());
  };

  const getCounselorId = (counselor: any) => {
    if (!counselor) return '';
    if (counselor.email) return counselor.email;
    if (typeof counselor._id === 'string') return counselor._id;
    if (counselor._id?.$oid) return counselor._id.$oid;
    if (counselor._id?.toString) return counselor._id.toString();
    return counselor.id || '';
  };

  const handleDeleteTeam = (teamId: string, teamName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete team "${teamName}"?`)) return;

    setTeamsList((prev) => {
      const updated = prev.filter((t) => t.id !== teamId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
      }
      return updated;
    });

    if (selectedTeam && selectedTeam.id === teamId) {
      setSelectedTeam(null);
    }

    setToastMessage(`Deleted team "${teamName}"`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const members = newTeamSelectedMembers;
    const newTeam = {
      id: `t-${Date.now()}`,
      name: newTeamName.trim(),
      admin: newTeamAdmin.trim() || 'Admin',
      installedRatio: `${members.length} / ${members.length}`,
      members: members,
      admins: [newTeamAdmin.trim() || 'Admin']
    };
    const updated = [newTeam, ...teamsList];
    setTeamsList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
    }
    setToastMessage(`Successfully created team "${newTeam.name}"!`);
    setIsAddTeamModalOpen(false);
    setNewTeamName('');
    setNewTeamAdmin('');
    setNewTeamSelectedMembers([]);
    setCounselorSearchInModal('');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRemoveMemberFromTeam = (memberName: string) => {
    if (!selectedTeam) return;
    const updatedMembers = selectedTeam.members.filter((m: string) => m !== memberName);
    const updatedTeam = { 
      ...selectedTeam, 
      members: updatedMembers, 
      installedRatio: `${updatedMembers.length} / ${updatedMembers.length}` 
    };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => {
      const updated = prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
      }
      return updated;
    });
    setToastMessage(`Removed ${memberName} from ${selectedTeam.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveAdminFromTeam = (adminName: string) => {
    if (!selectedTeam) return;
    const updatedAdmins = selectedTeam.admins.filter((a: string) => a !== adminName);
    const updatedTeam = { ...selectedTeam, admins: updatedAdmins };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => {
      const updated = prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
      }
      return updated;
    });
    setToastMessage(`Removed admin ${adminName} from ${selectedTeam.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAddCounselorsModal = () => {
    if (!selectedTeam) return;
    setSelectedCounselorsToAdd([]);
    setAddCounselorSearchQuery('');
    setIsAddCounselorModalOpen(true);
  };

  const handleConfirmAddCounselorsToTeam = () => {
    if (!selectedTeam || selectedCounselorsToAdd.length === 0) return;
    const updatedMembers = Array.from(new Set([...selectedTeam.members, ...selectedCounselorsToAdd]));
    const updatedTeam = {
      ...selectedTeam,
      members: updatedMembers,
      installedRatio: `${updatedMembers.length} / ${updatedMembers.length}`
    };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => {
      const updated = prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
      }
      return updated;
    });
    setToastMessage(`Added ${selectedCounselorsToAdd.length} counselor(s) to ${selectedTeam.name}!`);
    setIsAddCounselorModalOpen(false);
    setSelectedCounselorsToAdd([]);
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
    setPassword('Academically@01');
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

        {/* Header Right Bar: Profile Menu */}
        <div className="flex items-center justify-end">
          <UserProfileMenu />
        </div>

        {/* VIEW 1: TEAMS (Team Management) */}
        {currentView === 'teams' ? (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Teams</h1>

            {/* Primary Action Button: + Add team */}
            <div>
              {isAdmin ? (
                <button
                  onClick={() => setIsAddTeamModalOpen(true)}
                  className="inline-flex items-center space-x-3 bg-[#242938] hover:bg-[#1a1e29] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md"
                >
                  <div className="w-5 h-5 rounded-full border-2 border-white/80 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                  </div>
                  <span>Add team</span>
                </button>
              ) : (
                <div className="inline-flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>Manager View • Only System Admin can create new teams or edit team members</span>
                </div>
              )}
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
                      <th className="p-4 pl-12 font-bold w-1/4">
                        <div className="flex items-center justify-center space-x-1">
                          <span>Team</span>
                          <ArrowDown className="w-3.5 h-3.5 text-slate-900" />
                        </div>
                      </th>
                      <th className="p-4 font-bold text-center w-1/4">
                        <div className="flex items-center justify-center space-x-1">
                          <span>Team admins</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-4 font-bold text-center w-1/4">
                        <div className="flex items-center justify-center space-x-1">
                          <span>App installed</span>
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-4 pr-12 font-bold text-center w-1/4">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTeams.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-500 font-medium">
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
                          <td className="p-5 text-center font-semibold text-slate-900">{t.installedRatio}</td>
                          <td className="p-5 pr-12 text-center">
                            {isAdmin ? (
                              <button
                                onClick={(e) => handleDeleteTeam(t.id, t.name, e)}
                                className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                title="Delete Team"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400">Read-only</span>
                            )}
                          </td>
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

              {isAdmin ? (
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
              ) : (
                <div className="inline-flex items-center space-x-2 bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold">
                  <Info className="w-4 h-4 text-slate-500" />
                  <span>Manager View • Only System Admin can add or edit users</span>
                </div>
              )}
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
                      <th className="p-4">Created Date & Time</th>
                      <th className="p-4">Assigned Role</th>
                      <th className="p-4">Organization</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {counselors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
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
                        <td className="p-4 font-mono text-slate-700 text-xs">
                          {c.createdAt ? new Date(c.createdAt).toLocaleString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          }) : '08/11/2026, 10:46:01 AM'}
                        </td>
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
                          {isAdmin ? (
                            <>
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
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">Read-only</span>
                          )}
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
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedTeam.name}</h2>
                    <p className="text-xs text-slate-400">Admin: {selectedTeam.admin}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteTeam(selectedTeam.id, selectedTeam.name)}
                      className="flex items-center space-x-1 text-rose-600 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      title="Delete Team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Team</span>
                    </button>
                    <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-slate-900 p-1">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
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
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center">
                              {member.charAt(0)}
                            </div>
                            <span>{member}</span>
                          </div>
                          {isAdmin && (
                            <button 
                              onClick={() => handleRemoveMemberFromTeam(member)}
                              className="text-rose-400 hover:text-rose-600 font-bold p-1 rounded-full hover:bg-rose-50"
                              title="Remove member"
                            >
                              <X className="w-4 h-4 text-rose-400" />
                            </button>
                          )}
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
                          {isAdmin && (
                            <button 
                              onClick={() => handleRemoveAdminFromTeam(admin)}
                              className="text-rose-400 hover:text-rose-600 font-bold p-1 rounded-full hover:bg-rose-50"
                            >
                              <X className="w-4 h-4 text-rose-400" />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400">Sachin Negi</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Button: Add users */}
              <div className="pt-6">
                {isAdmin ? (
                  <button
                    onClick={handleOpenAddCounselorsModal}
                    className="w-full bg-[#ff5c75] hover:bg-[#ef4c65] text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all text-center"
                  >
                    Add users
                  </button>
                ) : (
                  <div className="w-full bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs py-3 rounded-xl text-center">
                    Read-only mode • Only System Admin can add or remove team members
                  </div>
                )}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Team Admin / Team Lead</label>
                  <select
                    value={newTeamAdmin}
                    onChange={(e) => setNewTeamAdmin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer shadow-xs"
                  >
                    {teamLeadsOptions.map((tl) => (
                      <option key={tl} value={tl}>
                        {tl}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Counselor Multi-Select Checklist */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Counselors / Members</label>
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search counselors..."
                      value={counselorSearchInModal}
                      onChange={(e) => setCounselorSearchInModal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                    />
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1 bg-slate-50/50">
                    {getAvailableCounselorObjects().length === 0 ? (
                      <div className="p-3 text-center space-y-1">
                        <p className="text-xs text-slate-500 font-medium">No registered counselors found.</p>
                        <p className="text-[11px] text-slate-400">Go to User Management tab to provision Counselor IDs first.</p>
                      </div>
                    ) : (
                      getAvailableCounselorObjects()
                        .filter((c) => c.name.toLowerCase().includes(counselorSearchInModal.toLowerCase()) || c.email.toLowerCase().includes(counselorSearchInModal.toLowerCase()))
                        .map((c) => {
                          const isSelected = newTeamSelectedMembers.includes(c.name);
                          return (
                            <label
                              key={c.name}
                              className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition-colors ${
                                isSelected ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200/60' : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setNewTeamSelectedMembers(newTeamSelectedMembers.filter((m) => m !== c.name));
                                    } else {
                                      setNewTeamSelectedMembers([...newTeamSelectedMembers, c.name]);
                                    }
                                  }}
                                  className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 accent-rose-500"
                                />
                                <span>{c.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{c.email}</span>
                            </label>
                          );
                        })
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{newTeamSelectedMembers.length} counselor(s) selected</p>
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

        {/* Modal 1.5: Add Counselors to Team Modal (From Drawer) */}
        {isAddCounselorModalOpen && selectedTeam && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Counselors to {selectedTeam.name}</h3>
                  <p className="text-xs text-slate-500">Select counselors to assign to this team</p>
                </div>
                <button onClick={() => setIsAddCounselorModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search counselors by name or email..."
                  value={addCounselorSearchQuery}
                  onChange={(e) => setAddCounselorSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {(() => {
                const availableToAdd = getAvailableCounselorObjects().filter(
                  (c) => !selectedTeam.members.includes(c.name)
                );
                const filteredAvailable = availableToAdd.filter(
                  (c) => c.name.toLowerCase().includes(addCounselorSearchQuery.toLowerCase()) || c.email.toLowerCase().includes(addCounselorSearchQuery.toLowerCase())
                );
                return (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                      <span>Available Counselors ({availableToAdd.length})</span>
                      <div className="space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCounselorsToAdd(availableToAdd.map((c) => c.name))}
                          className="text-rose-600 hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCounselorsToAdd([])}
                          className="text-slate-400 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-2 max-h-56 overflow-y-auto space-y-1.5 bg-slate-50/30">
                      {availableToAdd.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">All available counselors are already added to this team!</p>
                      ) : (
                        filteredAvailable.map((c) => {
                          const isChecked = selectedCounselorsToAdd.includes(c.name);
                          return (
                            <label
                              key={c.name}
                              className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-all ${
                                isChecked ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200' : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedCounselorsToAdd(selectedCounselorsToAdd.filter((n) => n !== c.name));
                                    } else {
                                      setSelectedCounselorsToAdd([...selectedCounselorsToAdd, c.name]);
                                    }
                                  }}
                                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 accent-rose-500"
                                />
                                <div>
                                  <p className="font-bold">{c.name}</p>
                                  <p className="text-[10px] text-slate-400">{c.email}</p>
                                </div>
                              </div>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{c.role}</span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddCounselorModalOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={selectedCounselorsToAdd.length === 0}
                        onClick={handleConfirmAddCounselorsToTeam}
                        className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md shadow-rose-500/20"
                      >
                        Add {selectedCounselorsToAdd.length} Counselor(s)
                      </button>
                    </div>
                  </>
                );
              })()}
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
                    <option value="COUNSELOR">Counselor</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="MANAGER">Manager</option>
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
                    <option value="COUNSELOR">Counselor</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="MANAGER">Manager</option>
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
