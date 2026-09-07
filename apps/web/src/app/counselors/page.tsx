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
  XCircle,
  Pencil,
  Search, 
  ChevronDown, 
  User, 
  ArrowUpDown, 
  ArrowDown,
  Info,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import Link from 'next/link';

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
  const [passwordCounselor, setPasswordCounselor] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Teams State (Persisted in localStorage)
  const [teamsList, setTeamsList] = useState<any[]>([]);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamAdmin, setNewTeamAdmin] = useState('Sachin Negi');
  const [newTeamAppCount, setNewTeamAppCount] = useState('5 / 5');
  const [newTeamSelectedMembers, setNewTeamSelectedMembers] = useState<string[]>([]);
  const [counselorSearchInModal, setCounselorSearchInModal] = useState('');

  // Team Leads & Admins Dropdown Options (All counselors and provisioned admins)
  const teamLeadsOptions = React.useMemo(() => {
    const list = counselors
      .map((c) => {
        const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
        return full || c.name || c.email?.split('@')[0];
      })
      .filter(Boolean);

    const merged = Array.from(new Set([...list, 'Rajdeep', 'Sachin Negi', 'Dev', 'Finance', 'Faiz']));
    return merged.filter(Boolean);
  }, [counselors]);

  // Counselor Selection for Active Team Modal
  const [isAddCounselorModalOpen, setIsAddCounselorModalOpen] = useState(false);
  const [selectedCounselorsToAdd, setSelectedCounselorsToAdd] = useState<string[]>([]);
  const [addCounselorSearchQuery, setAddCounselorSearchQuery] = useState('');

  // Filters for Teams
  const [teamRoleFilter, setTeamRoleFilter] = useState('Your team role');
  const [teamStatusFilter, setTeamStatusFilter] = useState('Status');
  const [teamSearchQuery, setTeamSearchQuery] = useState('');

  // Filters for Users
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userStatusFilter, setUserStatusFilter] = useState('All');

  // Form State for User Management
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SALES');
  const [isActiveStatus, setIsActiveStatus] = useState(true);
  const [password, setPassword] = useState('Academically@01');

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/auth/counselors', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCounselors(data);
        }
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
      const saved = localStorage.getItem('recorderhub_teams');
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (t: any) =>
                t &&
                t.name &&
                t.name !== 'Global Sales' &&
                t.name !== 'NCLEX Counselors' &&
                t.name !== 'DHA Counselors' &&
                t.name !== 'Sales Team'
            );
            setTeamsList(cleaned);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved teams:', e);
        }
      }
      setTeamsList([]);
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
    if (typeof counselor._id === 'string') return counselor._id;
    if (counselor._id?.$oid) return counselor._id.$oid;
    if (counselor._id?.toString) return counselor._id.toString();
    if (counselor.id) return counselor.id;
    if (counselor.email) return counselor.email;
    return '';
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

  const openCreateTeamModal = () => {
    setNewTeamName('');
    const defaultLead = teamLeadsOptions[0] || 'Rajdeep';
    setNewTeamAdmin(defaultLead);
    setNewTeamSelectedMembers([]);
    setCounselorSearchInModal('');
    setIsAddTeamModalOpen(true);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const adminSelected = newTeamAdmin.trim() || teamLeadsOptions[0] || 'Rajdeep';
    const members = newTeamSelectedMembers;
    const newTeam = {
      id: `t-${Date.now()}`,
      name: newTeamName.trim(),
      admin: adminSelected,
      installedRatio: `${members.length} / ${members.length}`,
      members: members,
      admins: [adminSelected]
    };
    const updated = [newTeam, ...teamsList];
    setTeamsList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
    }
    setToastMessage(`Successfully created team "${newTeam.name}" with admin "${adminSelected}"!`);
    setIsAddTeamModalOpen(false);
    setNewTeamName('');
    setNewTeamAdmin('');
    setNewTeamSelectedMembers([]);
    setCounselorSearchInModal('');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [isAddingAdminInDrawer, setIsAddingAdminInDrawer] = useState(false);
  const [selectedAdminToAdd, setSelectedAdminToAdd] = useState('');

  const handleAddAdminToTeam = (adminName: string) => {
    if (!selectedTeam || !adminName) return;
    const currentAdmins = selectedTeam.admins || (selectedTeam.admin ? [selectedTeam.admin] : []);
    const updatedAdmins = Array.from(new Set([...currentAdmins, adminName]));
    const updatedTeam = {
      ...selectedTeam,
      admin: updatedAdmins[0] || adminName,
      admins: updatedAdmins
    };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => {
      const updated = prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
      }
      return updated;
    });
    setIsAddingAdminInDrawer(false);
    setSelectedAdminToAdd('');
    setToastMessage(`Assigned team admin "${adminName}" to ${selectedTeam.name}!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSetPrimaryAdmin = (adminName: string) => {
    if (!selectedTeam) return;
    const currentAdmins = selectedTeam.admins || (selectedTeam.admin ? [selectedTeam.admin] : []);
    const reordered = [adminName, ...currentAdmins.filter((a: string) => a !== adminName)];
    const updatedTeam = {
      ...selectedTeam,
      admin: adminName,
      admins: reordered
    };
    setSelectedTeam(updatedTeam);
    setTeamsList((prev) => {
      const updated = prev.map((t) => (t.id === selectedTeam.id ? updatedTeam : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('recorderhub_teams', JSON.stringify(updated));
      }
      return updated;
    });
    setToastMessage(`Set "${adminName}" as primary lead for ${selectedTeam.name}`);
    setTimeout(() => setToastMessage(null), 3000);
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
    const currentAdmins = selectedTeam.admins || (selectedTeam.admin ? [selectedTeam.admin] : []);
    const updatedAdmins = currentAdmins.filter((a: string) => a !== adminName);
    const updatedTeam = {
      ...selectedTeam,
      admin: updatedAdmins[0] || (updatedAdmins.length > 0 ? updatedAdmins[0] : 'Unassigned'),
      admins: updatedAdmins
    };
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

    const updatePayload: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role: role,
    };

    if (editNewPassword.trim()) {
      updatePayload.password = editNewPassword.trim();
    }

    setToastMessage(`Updated details${editNewPassword.trim() ? ' & password' : ''} for ${firstName || email}!`);
    setEditingCounselor(null);
    setEditNewPassword('');
    setShowEditPassword(false);
    resetForm();

    try {
      await fetch(`/api/v1/auth/counselors?id=${encodeURIComponent(targetId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
    } catch (err: any) {
      console.error('Error updating counselor:', err);
    }
  };

  const openChangePasswordModal = (counselor: any) => {
    setPasswordCounselor(counselor);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordCounselor) return;

    if (!newPassword.trim()) {
      alert('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      alert('Passwords do not match. Please verify and confirm your new password.');
      return;
    }

    const targetId = getCounselorId(passwordCounselor);
    const targetEmail = passwordCounselor.email;
    const displayName = `${passwordCounselor.firstName || ''} ${passwordCounselor.lastName || ''}`.trim() || passwordCounselor.email || 'Counselor';

    try {
      setSubmitting(true);
      const res = await fetch(`/api/v1/auth/counselors?id=${encodeURIComponent(targetId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: newPassword.trim() }),
      });

      if (res.ok) {
        setToastMessage(`Password successfully updated for ${displayName}!`);
        setPasswordCounselor(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to update password');
      }
    } catch (err: any) {
      console.error('Error updating password:', err);
      alert('Failed to update password');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDeleteCounselor = async (counselor: any) => {
    const targetId = getCounselorId(counselor);
    const displayName = (counselor.firstName || counselor.email || 'Counselor').trim();
    if (!confirm(`Are you sure you want to delete counselor "${displayName}"?\n\nThis will permanently delete:\n- Counselor Account\n- All associated Call Logs from database\n- All associated Audio Recordings from AWS S3 storage`)) return;

    setCounselors((prev) =>
      prev.filter((item) => getCounselorId(item) !== targetId && item.email !== counselor.email)
    );

    setToastMessage(`Deleting ${displayName}, call logs, and S3 recordings...`);

    try {
      const res = await fetch(`/api/v1/auth/counselors?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setToastMessage(`Deleted ${displayName} (${data.deletedCallsCount || 0} call logs & ${data.deletedS3RecordingsCount || 0} S3 recordings removed)`);
      }
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
    setEditNewPassword('');
    setShowEditPassword(false);
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('COUNSELOR');
    setPassword('Academically@01');
    setEditNewPassword('');
    setShowEditPassword(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredTeams = teamsList.filter((t) =>
    t.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    t.admin.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  const filteredCounselors = counselors.filter((c) => {
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || '';
    const query = userSearchQuery.toLowerCase();
    const matchesSearch =
      fullName.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.role && c.role.toLowerCase().includes(query));

    const roleUpper = (c.role || '').toUpperCase();
    const matchesRole =
      userRoleFilter === 'All' ||
      roleUpper === userRoleFilter.toUpperCase() ||
      (userRoleFilter === 'SALES' && (roleUpper === 'COUNSELOR' || roleUpper === 'AGENT' || roleUpper === 'SALES_AGENT')) ||
      (userRoleFilter === 'ADMIN' && roleUpper === 'COMPANY_ADMIN');

    const matchesStatus =
      userStatusFilter === 'All' ||
      (userStatusFilter === 'Active' && c.isActive !== false) ||
      (userStatusFilter === 'Inactive' && c.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (isCounselor) {
    return (
      <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
        <Navigation />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-5 max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
              <Shield className="w-8 h-8 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Team and User Management are restricted to Administrators and Team Leads. Sales users have access exclusively to their Call Logs and Analytics.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/calls"
                className="inline-flex items-center space-x-2 bg-[#242938] hover:bg-[#1a1e29] text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md"
              >
                <span>Go to My Call Logs</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
                  onClick={openCreateTeamModal}
                  className="inline-flex items-center space-x-3 bg-[#242938] hover:bg-[#1a1e29] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-md cursor-pointer"
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
        ) : !isAdmin ? (
          /* RESTRICTED ACCESS: Non-Admin trying to access User Management */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-5 max-w-lg mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
              <Shield className="w-8 h-8 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Admin Access Only</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                User Management and credential provisioning are strictly restricted to System Administrators. Your current role is <span className="font-semibold text-slate-700 font-mono">[{userRole}]</span>.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/counselors?view=teams"
                className="inline-flex items-center space-x-2 bg-[#242938] hover:bg-[#1a1e29] text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md"
              >
                <span>Return to Team Management</span>
              </Link>
            </div>
          </div>
        ) : (
          /* VIEW 2: USER MANAGEMENT (Matches User Screenshot) */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
                <p className="text-xs text-slate-500 mt-1">Admin Console • Provision, Update & Revoke User Accounts & Credentials</p>
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 bg-[#242938] hover:bg-[#1a1e29] text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create New User</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center space-x-4 text-xs font-semibold text-slate-700">
                <div className="relative">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 shadow-xs focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Roles</option>
                    <option value="SALES">Sales</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 shadow-xs focus:outline-none cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <button
                  onClick={fetchCounselors}
                  className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
                  title="Refresh Directory"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-500' : 'text-slate-500'}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Counselors Table (Pixel-perfect matching screenshot) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white border-b border-slate-100">
                    <tr>
                      <th className="py-4 pl-8 font-semibold text-slate-500 uppercase text-xs tracking-wider w-[24%]">
                        NAME
                      </th>
                      <th className="py-4 px-4 font-semibold text-slate-500 uppercase text-xs tracking-wider w-[32%]">
                        EMAIL
                      </th>
                      <th className="py-4 px-4 font-semibold text-slate-500 uppercase text-xs tracking-wider w-[15%]">
                        ROLE
                      </th>
                      <th className="py-4 px-4 font-semibold text-slate-500 uppercase text-xs tracking-wider w-[17%]">
                        STATUS
                      </th>
                      <th className="py-4 pr-8 font-semibold text-slate-500 uppercase text-xs tracking-wider text-right w-[12%]">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredCounselors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">
                          {loading ? 'Loading user directory...' : 'No users match the selected criteria.'}
                        </td>
                      </tr>
                    ) : (
                      filteredCounselors.map((c) => {
                        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || c.email?.split('@')[0] || 'User';
                        const roleUpper = (c.role || '').toUpperCase();
                        const isRoleAdmin = roleUpper === 'ADMIN' || roleUpper === 'COMPANY_ADMIN';
                        const isRoleSales = roleUpper === 'SALES' || roleUpper === 'COUNSELOR' || roleUpper === 'AGENT' || roleUpper === 'SALES_AGENT';
                        const isRoleManager = roleUpper === 'MANAGER' || roleUpper === 'SALES_MANAGER';
                        const isRoleLead = roleUpper === 'TEAM_LEAD';

                        return (
                          <tr key={c._id || c.email || c.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* NAME */}
                            <td className="py-5 pl-8 font-bold text-slate-900 text-sm whitespace-nowrap">
                              {fullName}
                            </td>

                            {/* EMAIL */}
                            <td className="py-5 px-4 text-slate-500 text-sm whitespace-nowrap">
                              {c.email}
                            </td>

                            {/* ROLE */}
                            <td className="py-5 px-4 whitespace-nowrap">
                              {isRoleAdmin ? (
                                <span className="inline-flex items-center justify-center bg-[#e0f2fe]/70 text-[#0284c7] border border-[#bae6fd] px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                  ADMIN
                                </span>
                              ) : isRoleSales ? (
                                <span className="inline-flex items-center justify-center bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa] px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                  SALES
                                </span>
                              ) : isRoleManager ? (
                                <span className="inline-flex items-center justify-center bg-[#faf5ff] text-[#9333ea] border border-[#e9d5ff] px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                  MANAGER
                                </span>
                              ) : isRoleLead ? (
                                <span className="inline-flex items-center justify-center bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe] px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                  TEAM LEAD
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 border border-slate-200 px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                                  {c.role}
                                </span>
                              )}
                            </td>

                            {/* STATUS */}
                            <td className="py-5 px-4 whitespace-nowrap">
                              {isRoleAdmin ? (
                                <span className="text-slate-300 font-medium text-sm select-none pl-1">—</span>
                              ) : c.isActive !== false ? (
                                <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50/50 text-emerald-600 text-xs font-bold shadow-2xs">
                                  <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-lg border border-slate-300/80 bg-slate-100 text-slate-500 text-xs font-bold shadow-2xs">
                                  <XCircle className="w-4 h-4 stroke-[2.2]" />
                                  <span>Inactive</span>
                                </span>
                              )}
                            </td>

                            {/* ACTIONS */}
                            <td className="py-5 pr-8 text-right whitespace-nowrap">
                              {isAdmin ? (
                                <div className="flex items-center justify-end space-x-5">
                                  <button
                                    onClick={() => openEditModal(c)}
                                    title="Edit User"
                                    className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Pencil className="w-4 h-4 stroke-[1.75]" />
                                  </button>
                                  <button
                                    onClick={() => openChangePasswordModal(c)}
                                    title="Change Password"
                                    className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Shield className="w-4 h-4 stroke-[1.75]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCounselor(c)}
                                    title="Delete User"
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 stroke-[1.75]" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-400">Read-only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE-OVER DRAWER: Team Details */}
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
                      className="flex items-center space-x-1 text-rose-600 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      title="Delete Team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Team</span>
                    </button>
                    <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-slate-900 p-1 cursor-pointer">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-end space-x-6 border-b border-slate-100 pb-2 text-sm">
                  <button
                    onClick={() => setActiveDrawerTab('current')}
                    className={`font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                      activeDrawerTab === 'current'
                        ? 'text-slate-900 border-[#ff5c75]'
                        : 'text-slate-400 border-transparent hover:text-slate-700'
                    }`}
                  >
                    Current user
                  </button>
                  <button
                    onClick={() => setActiveDrawerTab('invited')}
                    className={`font-bold pb-2 border-b-2 transition-all cursor-pointer ${
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
                              className="text-rose-400 hover:text-rose-600 font-bold p-1 rounded-full hover:bg-rose-50 cursor-pointer"
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-sm font-bold text-slate-900">
                      <span>Team admins</span>
                      <Info className="w-4 h-4 text-slate-400" />
                    </div>

                    {isAdmin && !isAddingAdminInDrawer && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAdminToAdd(teamLeadsOptions[0] || 'Rajdeep');
                          setIsAddingAdminInDrawer(true);
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add / Change Admin</span>
                      </button>
                    )}
                  </div>

                  {/* Inline Add Admin Form */}
                  {isAddingAdminInDrawer && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
                      <label className="block text-xs font-bold text-slate-700">Select Counselor / Lead to Assign</label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedAdminToAdd}
                          onChange={(e) => setSelectedAdminToAdd(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 text-slate-900 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                        >
                          {teamLeadsOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddAdminToTeam(selectedAdminToAdd)}
                          className="bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingAdminInDrawer(false)}
                          className="text-slate-400 hover:text-slate-600 px-2 py-2 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto">
                    {selectedTeam.admins && selectedTeam.admins.length > 0 ? (
                      selectedTeam.admins.map((admin: string, idx: number) => {
                        const isPrimary = selectedTeam.admin === admin || (idx === 0 && !selectedTeam.admin);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3.5 text-sm text-slate-800 font-medium hover:bg-slate-50 transition-colors">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                                {admin.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-900">{admin}</span>
                              {isPrimary ? (
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  Primary Lead
                                </span>
                              ) : (
                                isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryAdmin(admin)}
                                    className="text-[10px] text-slate-400 hover:text-slate-700 hover:underline cursor-pointer"
                                  >
                                    (Set as Primary)
                                  </button>
                                )
                              )}
                            </div>
                            {isAdmin && (
                              <button 
                                onClick={() => handleRemoveAdminFromTeam(admin)}
                                className="text-rose-400 hover:text-rose-600 font-bold p-1 rounded-full hover:bg-rose-50 cursor-pointer"
                                title="Remove admin"
                              >
                                <X className="w-4 h-4 text-rose-400" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-xs text-slate-400 text-center">
                        No team admin assigned. Click &quot;Add / Change Admin&quot; above.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Button: Add users */}
              <div className="pt-6">
                {isAdmin ? (
                  <button
                    onClick={handleOpenAddCounselorsModal}
                    className="w-full bg-[#ff5c75] hover:bg-[#ef4c65] text-white font-bold text-sm py-3.5 rounded-xl shadow-md transition-all text-center cursor-pointer"
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
                <button onClick={() => setIsAddTeamModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
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
                        {isAdmin ? (
                          <p className="text-[11px] text-slate-400">Go to User Management tab to provision Counselor IDs first.</p>
                        ) : (
                          <p className="text-[11px] text-slate-400">Please contact your System Admin to provision Counselor IDs.</p>
                        )}
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
                                  className="rounded text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 accent-rose-500 cursor-pointer"
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
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#242938] hover:bg-[#1a1e29] text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
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
                <button onClick={() => setIsAddCounselorModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
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
                          className="text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCounselorsToAdd([])}
                          className="text-slate-400 hover:underline cursor-pointer"
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
                                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 accent-rose-500 cursor-pointer"
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
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={selectedCounselorsToAdd.length === 0}
                        onClick={handleConfirmAddCounselorsToTeam}
                        className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md shadow-rose-500/20 cursor-pointer"
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

        {/* Modal 2: Create User Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Create New User</h3>
                  <p className="text-xs text-slate-500">Provision credentials and system access</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
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
                      placeholder="e.g. Lekshmi"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Raj"
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
                    placeholder="e.g. lekshmi.raj@academically.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="SALES">Sales</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="TEAM_LEAD">Team Lead</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                    <select
                      value={isActiveStatus ? 'ACTIVE' : 'INACTIVE'}
                      onChange={(e) => setIsActiveStatus(e.target.value === 'ACTIVE')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
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
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#242938] hover:bg-[#1a1e29] text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {submitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Edit User Modal */}
        {editingCounselor && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Update User Profile & Role</h3>
                  <p className="text-xs text-slate-500">Modify role permissions, account status, or credentials</p>
                </div>
                <button onClick={() => setEditingCounselor(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="SALES">Sales</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="TEAM_LEAD">Team Lead</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                    <select
                      value={isActiveStatus ? 'ACTIVE' : 'INACTIVE'}
                      onChange={(e) => setIsActiveStatus(e.target.value === 'ACTIVE')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Optional Change Password in Edit Modal */}
                <div className="pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Change Password (Optional)</label>
                    <span className="text-[10px] text-slate-400">Leave blank to keep current</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Enter new password (optional)"
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingCounselor(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {submitting ? 'Saving Changes...' : 'Update Role & Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: Dedicated Change Password Modal */}
        {passwordCounselor && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
                    <p className="text-xs text-slate-500">Update login credentials for user</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPasswordCounselor(null)} 
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target User Info Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {(passwordCounselor.firstName || passwordCounselor.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {passwordCounselor.firstName || ''} {passwordCounselor.lastName || ''}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">{passwordCounselor.email}</p>
                  </div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                  {passwordCounselor.role || 'SALES'}
                </span>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* New Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">New Password</label>
                    <button
                      type="button"
                      onClick={() => setNewPassword('Academically@01')}
                      className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold hover:underline cursor-pointer"
                    >
                      Use Default (Academically@01)
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new password (min 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword && (
                    <div className="mt-1.5 flex items-center space-x-1 text-[11px]">
                      {newPassword === confirmPassword ? (
                        <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Passwords match</span>
                        </span>
                      ) : (
                        <span className="text-rose-500 font-semibold flex items-center space-x-1">
                          <X className="w-3.5 h-3.5" />
                          <span>Passwords do not match</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Helper Info Notice */}
                <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Instant Sync</span>
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    The user will immediately be able to log in to the RecordHub mobile Android APK and Web Dashboard using this new password.
                  </p>
                </div>

                {/* Modal Actions */}
                <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPasswordCounselor(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (newPassword.length < 6) || (confirmPassword.length > 0 && newPassword !== confirmPassword)}
                    className="bg-[#242938] hover:bg-[#1a1e29] disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Updating...' : 'Update Password'}</span>
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
