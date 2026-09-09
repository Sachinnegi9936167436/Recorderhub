'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Navigation, useUserRole } from '@/components/Navigation';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  User,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  PlayCircle,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  X,
  AlertTriangle,
  AlertCircle,
  Mic,
  Clock,
  PhoneCall,
  Flame,
  Volume2,
  Star,
  Bookmark,
  Check,
  Play,
  Pause
} from 'lucide-react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

const audioDurationCache = new Map<string, number>();

function getCallAudioDuration(call: any): number | null {
  if (typeof call.recordingDuration === 'number' && call.recordingDuration > 0) return call.recordingDuration;
  if (typeof call.audioDuration === 'number' && call.audioDuration > 0) return call.audioDuration;
  const audioSrc = call.audioUrl || (call.s3Key ? `/api/v1/recordings/stream?key=${encodeURIComponent(call.s3Key)}` : null);
  if (audioSrc && audioDurationCache.has(audioSrc)) {
    return audioDurationCache.get(audioSrc)!;
  }
  return null;
}

function isCallDurationMismatch(call: any): boolean {
  // Ignore calls where recording does NOT exist (only compare calls that actually have recordings)
  const hasRecording = (call.audioUrl || call.s3Key || call.recordingStatus === 'COMPLETED' || call.recordingStatus === 'PENDING_UPLOAD') && call.recordingStatus !== 'NONE';
  if (!hasRecording) return false;

  const isAns = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
  const callDur = isAns ? Number(call.durationSeconds || 0) : 0;
  const recDur = getCallAudioDuration(call);

  if (recDur !== null) {
    // 1. Unanswered/0s call with recording >= 5s -> Mismatch
    if (callDur === 0 && recDur >= 5) return true;
    if (callDur > 0 && recDur === 0) return true;

    // 2. Severe stub/partial file: Call is >= 30s but recording is < 15s -> Mismatch
    if (callDur >= 30 && recDur < 15) return true;

    const diff = Math.abs(callDur - recDur);

    // 3. For short calls (< 30s), a difference >= 10s is a mismatch
    if (callDur < 30) {
      return diff >= 10;
    }

    // 4. For longer calls (>= 30s):
    // Standard VBR MP3 header estimations by browsers can vary by 5-10% (e.g. 8m 46s vs 9m 13s is a 95% match).
    // A true recording mismatch occurs when audio covers < 80% of call talk time AND difference >= 30s.
    const coverageRatio = recDur / callDur;
    if (coverageRatio < 0.80 && diff >= 30) {
      return true;
    }
  }
  return false;
}

function AudioCell({ call, idx, canListen = true }: { call: any; idx: number; canListen?: boolean }) {
  const { currentCall, isPlaying, playCall, duration: activePlayerDuration } = useAudioPlayer();

  const isAnswered = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
  const hasRecording = call.audioUrl || call.s3Key || call.recordingStatus === 'COMPLETED' || call.recordingStatus === 'PENDING_UPLOAD';

  if (!canListen) {
    return (
      <span className="inline-flex items-center space-x-1 text-slate-400 font-medium text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Access Restricted: You can only listen to call recordings of counselors in your team.">
        <span>🔒</span>
        <span>Restricted</span>
      </span>
    );
  }

  if (!isAnswered || call.recordingStatus === 'NONE' || (!hasRecording && !call.audioUrl)) {
    return <span className="text-slate-400 font-medium text-[11px]">No Recording</span>;
  }

  const audioSrc = call.audioUrl || (call.s3Key ? `/api/v1/recordings/stream?key=${encodeURIComponent(call.s3Key)}` : null);

  if (!audioSrc) {
    if (call.recordingStatus === 'PENDING_UPLOAD') {
      return (
        <span className="inline-flex items-center space-x-1 text-amber-600 font-medium text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Audio recording is syncing to AWS S3...">
          <span>⏳</span>
          <span>Syncing...</span>
        </span>
      );
    }
    return <span className="text-slate-400 font-medium text-[11px]">No Recording</span>;
  }

  const isThisCallActive = Boolean(currentCall && (
    (currentCall._id && currentCall._id === call._id) ||
    (currentCall.id && currentCall.id === call.id) ||
    (currentCall.idempotencyKey && currentCall.idempotencyKey === call.idempotencyKey) ||
    (currentCall.audioUrl && currentCall.audioUrl === call.audioUrl)
  ));

  const isThisCallPlaying = isThisCallActive && isPlaying;

  // Track actual audio file duration from metadata / cache
  const [actualDuration, setActualDuration] = useState<number | null>(() => {
    if (call.recordingDuration && call.recordingDuration > 0) return call.recordingDuration;
    if (call.audioDuration && call.audioDuration > 0) return call.audioDuration;
    if (audioSrc && audioDurationCache.has(audioSrc)) {
      return audioDurationCache.get(audioSrc)!;
    }
    return null;
  });

  useEffect(() => {
    if (!audioSrc || actualDuration !== null) return;
    if (audioDurationCache.has(audioSrc)) {
      setActualDuration(audioDurationCache.get(audioSrc)!);
      return;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        const rounded = Math.round(audio.duration);
        audioDurationCache.set(audioSrc, rounded);
        setActualDuration(rounded);
      }
    };
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.src = audioSrc;

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.src = '';
    };
  }, [audioSrc, actualDuration]);

  // When active player is playing this call and reports duration, update cache and state
  useEffect(() => {
    if (isThisCallActive && activePlayerDuration > 0 && audioSrc) {
      const rounded = Math.round(activePlayerDuration);
      audioDurationCache.set(audioSrc, rounded);
      setActualDuration(rounded);
    }
  }, [isThisCallActive, activePlayerDuration, audioSrc]);

  const rawPhone = call.phoneNumber || call.phone || '';
  const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10) || 'Contact';
  const contactName = (call.leadName || call.name || cleanDigits).replace(/[^a-zA-Z0-9_-]/g, '_');
  const recordDate = call.startTime ? new Date(call.startTime) : new Date();
  const dateFormatted = recordDate.toISOString().slice(0, 10);
  const timeFormatted = recordDate.toTimeString().slice(0, 8).replace(/:/g, '-');
  const downloadFileName = `Recording_${contactName}_${cleanDigits}_${dateFormatted}_${timeFormatted}.m4a`;

  const timeDisplayStr = recordDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const durationSec = actualDuration ?? (isThisCallActive && activePlayerDuration > 0 ? activePlayerDuration : (call.recordingDuration || call.audioDuration || call.durationSeconds || 0));

  const formatAudioDuration = (sec: number) => {
    const totalSec = Math.round(sec || 0);
    if (totalSec <= 0) return 'Play';
    const mins = Math.floor(totalSec / 60);
    const remainingSecs = totalSec % 60;

    if (mins === 0) {
      return `${remainingSecs}s`;
    }
    if (remainingSecs === 0) {
      return `${mins}m`;
    }
    return `${mins}m ${remainingSecs}s`;
  };

  const durationLabel = formatAudioDuration(durationSec);

  return (
    <div className="flex flex-col items-center justify-center py-0.5 space-y-1">
      <div className="flex items-center justify-center space-x-1.5">
        <button
          type="button"
          onClick={() => playCall(call)}
          title={isThisCallPlaying ? 'Pause recording (Space)' : 'Play recording (Hotkeys: Space, J/L to skip)'}
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
            isThisCallPlaying
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 ring-2 ring-rose-400/40'
              : isThisCallActive
                ? 'bg-rose-50 text-rose-600 border border-rose-300 hover:bg-rose-100'
                : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border border-slate-200'
          }`}
        >
          {isThisCallPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 text-white fill-current" />
              <div className="flex items-end space-x-0.5 h-3">
                <span className="w-0.5 bg-white rounded-full animate-[bounce_0.6s_infinite] h-3" />
                <span className="w-0.5 bg-white rounded-full animate-[bounce_0.8s_infinite] h-2" />
                <span className="w-0.5 bg-white rounded-full animate-[bounce_0.5s_infinite] h-2.5" />
              </div>
              <span className="text-[11px] font-mono">Playing</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-rose-600 fill-current" />
              <span className="text-[11px] font-mono">{durationLabel}</span>
            </>
          )}
        </button>

        <a
          href={audioSrc}
          download={downloadFileName}
          title={`Download audio file: ${downloadFileName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
        <Clock className="w-2.5 h-2.5 text-slate-400" />
        <span>Rec: {timeDisplayStr}</span>
      </div>
    </div>
  );
}

function SalestrailCallsInner() {
  const { role, email: userEmail, isAdmin, isManager, isTeamLead, isCounselor } = useUserRole();
  const { currentCall, isPlayerVisible } = useAudioPlayer();
  const searchParams = useSearchParams();
  const isRecordingsOnly = searchParams.get('filter') === 'recordings';

  const [callsList, setCallsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters from Salestrail UI screenshot
  const [dateRange, setDateRange] = useState('All time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [repCategory, setRepCategory] = useState('Teams');
  const [subFilter, setSubFilter] = useState('All Teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [anomalyFilter, setAnomalyFilter] = useState<'all' | 'short_calls' | 'recordings' | 'sim' | 'whatsapp' | 'long_calls' | 'mismatch' | 'bookmarked'>('all');
  const [audioCacheVer, setAudioCacheVer] = useState(0);

  const [reviewingCall, setReviewingCall] = useState<any | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewBookmark, setReviewBookmark] = useState<boolean>(false);
  const [savingReview, setSavingReview] = useState(false);

  const openReviewModal = (call: any) => {
    setReviewingCall(call);
    setReviewRating(Number(call.rating || 0));
    setReviewNotes(call.notes || '');
    setReviewBookmark(Boolean(call.isBookmarked));
  };

  const handleSaveReview = async () => {
    if (!reviewingCall) return;
    try {
      setSavingReview(true);
      const callId = reviewingCall._id || reviewingCall.id || reviewingCall.idempotencyKey;
      const res = await fetch('/api/v1/calls/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId,
          rating: reviewRating,
          notes: reviewNotes,
          isBookmarked: reviewBookmark,
        }),
      });
      if (res.ok) {
        setCallsList((prev) =>
          prev.map((c) =>
            (c._id === callId || c.idempotencyKey === callId)
              ? { ...c, rating: reviewRating, notes: reviewNotes, isBookmarked: reviewBookmark }
              : c
          )
        );
        setReviewingCall(null);
      }
    } catch (e) {
      console.error('Error saving review:', e);
    } finally {
      setSavingReview(false);
    }
  };

  const handleRepCategoryChange = (cat: string) => {
    setRepCategory(cat);
    if (cat === 'Individual') {
      setSubFilter('All Counselors');
    } else {
      setSubFilter('All Teams');
    }
  };

  const [counselorsList, setCounselorsList] = useState<any[]>([]);
  const [assigningDeviceId, setAssigningDeviceId] = useState<string | null>(null);

  const fetchCalls = async () => {
    try {
      if (callsList.length === 0) setLoading(true);
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

  const fetchProvisionedCounselors = async () => {
    try {
      const res = await fetch('/api/v1/auth/counselors', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCounselorsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching counselors list:', err);
    }
  };

  useEffect(() => {
    fetchCalls();
    fetchProvisionedCounselors();
    fetchTeams();
    // Reconcile any unlinked S3 recordings in the background
    fetch('/api/v1/recordings/reconcile', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.reconciledCount > 0) {
          fetchCalls();
        }
      })
      .catch(() => {});

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchCalls();
      }
    }, 30000);

    const handleGlobalPlay = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      if (target && target.tagName === 'AUDIO') {
        const allAudios = document.querySelectorAll('audio');
        allAudios.forEach((audio) => {
          if (audio !== target && !audio.paused) {
            audio.pause();
          }
        });
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('play', handleGlobalPlay, true);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('play', handleGlobalPlay, true);
      }
    };
  }, []);

  // Background prefetch audio durations for calls with recordings to ensure accurate mismatch counting and filtering
  useEffect(() => {
    if (!callsList || callsList.length === 0) return;

    let isMounted = true;
    let updateTimer: any = null;

    const notifyChange = () => {
      if (!updateTimer) {
        updateTimer = setTimeout(() => {
          updateTimer = null;
          if (isMounted) setAudioCacheVer((v) => v + 1);
        }, 150);
      }
    };

    const callsWithAudio = callsList.filter(
      (c) => (c.audioUrl || c.s3Key) && c.recordingStatus !== 'NONE'
    );

    callsWithAudio.forEach((c) => {
      const audioSrc = c.audioUrl || (c.s3Key ? `/api/v1/recordings/stream?key=${encodeURIComponent(c.s3Key)}` : null);
      if (!audioSrc || audioDurationCache.has(audioSrc)) return;

      const audio = new Audio();
      audio.preload = 'metadata';
      const onLoaded = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
          audioDurationCache.set(audioSrc, Math.round(audio.duration));
          notifyChange();
        }
        cleanup();
      };
      const onError = () => {
        cleanup();
      };
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        audio.src = '';
      };

      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
      audio.src = audioSrc;
    });

    return () => {
      isMounted = false;
      if (updateTimer) clearTimeout(updateTimer);
    };
  }, [callsList]);

  const handleAssignCounselor = async (deviceId: string, newCounselorName: string) => {
    if (!deviceId || !newCounselorName) return;
    try {
      setAssigningDeviceId(deviceId);
      const res = await fetch('/api/v1/calls/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, agentName: newCounselorName }),
      });
      if (res.ok) {
        // Optimistically update local call list state for matching deviceId
        setCallsList((prevCalls) =>
          prevCalls.map((c) => (c.deviceId === deviceId ? { ...c, agentName: newCounselorName } : c))
        );
        fetchCalls();
      }
    } catch (err) {
      console.error('Error assigning counselor:', err);
    } finally {
      setAssigningDeviceId(null);
    }
  };

  const resolveCounselorName = (call: any) => {
    // 1. Match by counselor email in counselorsList directory
    const callEmail = (call.counselorEmail || call.email || '').toLowerCase();
    if (callEmail && counselorsList.length > 0) {
      const user = counselorsList.find((u) => u.email?.toLowerCase() === callEmail);
      if (user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (fullName) return fullName;
      }
    }

    // 2. Match device ID or agent name alias with directory email
    if (counselorsList.length > 0) {
      const rawName = (call.agentName || call.counselorName || '').toLowerCase();
      const user = counselorsList.find((u) => {
        const prefix = u.email ? u.email.split('@')[0].toLowerCase() : '';
        const fName = (u.firstName || '').toLowerCase();
        return (prefix && rawName.includes(prefix)) || (fName && rawName.includes(fName));
      });
      if (user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (fullName) return fullName;
      }
    }

    const rawName = call.agentName || call.counselorName || call.userName || call.user || '';
    if (rawName && rawName !== 'Counselor Agent' && rawName !== 'Counselor' && !rawName.startsWith('ANDROID-')) {
      return rawName;
    }
    if (callEmail) {
      const prefix = callEmail.split('@')[0];
      return prefix.replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
    if (call.deviceId) {
      const cleanDev = call.deviceId.replace(/^ANDROID-/, '');
      const modelTag = cleanDev.split('-')[0] || cleanDev.slice(0, 10);
      return `Counselor (${modelTag})`;
    }
    return 'Counselor Agent';
  };

  const [teamsList, setTeamsList] = useState<any[]>([]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/v1/teams', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTeamsList(data);
        }
      }
    } catch (err) {
      console.error('Error fetching calls teams:', err);
    }
  };

  const activeTeams = teamsList;

  const myManagedTeams = useMemo(() => {
    if (isAdmin || isManager) return activeTeams;
    const myEmailLower = (userEmail || '').toLowerCase().trim();
    const myNamePrefix = myEmailLower ? myEmailLower.split('@')[0] : '';
    return activeTeams.filter((team) => {
      const adminStr = (team.admin || '').toLowerCase().trim();
      const teamLeadEmailStr = (team.teamLeadEmail || '').toLowerCase().trim();
      const adminsArr = Array.isArray(team.admins) ? team.admins.map((a: string) => (a || '').toLowerCase().trim()) : [];

      const isMatch = (
        (teamLeadEmailStr && (teamLeadEmailStr === myEmailLower || myEmailLower.includes(teamLeadEmailStr))) ||
        (adminStr && (
          adminStr === myEmailLower ||
          adminStr === myNamePrefix ||
          adminStr.includes(myNamePrefix) ||
          myNamePrefix.includes(adminStr) ||
          (myNamePrefix.includes('rajdeep') && adminStr.includes('rajdeep'))
        )) ||
        adminsArr.some((a: string) => 
          a === myEmailLower || 
          a === myNamePrefix || 
          a.includes(myNamePrefix) || 
          myNamePrefix.includes(a) ||
          (myNamePrefix.includes('rajdeep') && a.includes('rajdeep'))
        )
      );
      return isMatch;
    });
  }, [activeTeams, userEmail, isAdmin, isManager]);

  const myTeamMemberIdentifiers = useMemo(() => {
    if (isAdmin || isManager) return [];
    const memberSet = new Set<string>();
    const myEmailLower = (userEmail || '').toLowerCase().trim();
    const myNamePrefix = myEmailLower ? myEmailLower.split('@')[0] : '';

    if (myEmailLower) memberSet.add(myEmailLower);
    if (myNamePrefix) memberSet.add(myNamePrefix);
    if (myNamePrefix.includes('rajdeep')) memberSet.add('rajdeep');

    myManagedTeams.forEach((team) => {
      if (Array.isArray(team.members)) {
        team.members.forEach((m: string) => {
          if (m) {
            const mClean = m.toLowerCase().trim();
            memberSet.add(mClean);
            const mPrefix = mClean.split('@')[0].split(' ')[0];
            if (mPrefix) memberSet.add(mPrefix);
          }
        });
      }
    });

    return Array.from(memberSet);
  }, [myManagedTeams, userEmail, isAdmin, isManager]);

  const canUserAccessCall = (call: any) => {
    // 1. System Admin: Can view and listen to ALL call recordings across all teams
    if (isAdmin) return { canView: true, canListen: true };

    // 2. Manager: Can view call logs and call log time of EVERY counsellor
    if (isManager) return { canView: true, canListen: true };

    const resolvedCounselor = resolveCounselorName(call).toLowerCase();
    const callEmail = (call.counselorEmail || call.email || '').toLowerCase();
    const myEmailLower = (userEmail || '').toLowerCase();
    const myNamePrefix = myEmailLower ? myEmailLower.split('@')[0] : '';

    // 3. Sales User / Counselor: Can ONLY view & listen to their OWN calls
    if (isCounselor) {
      const isMyOwnCall =
        (callEmail && callEmail === myEmailLower) ||
        (myNamePrefix && resolvedCounselor.includes(myNamePrefix)) ||
        (myNamePrefix && myNamePrefix.includes('shris') && resolvedCounselor.includes('shristi'));

      return { canView: isMyOwnCall, canListen: isMyOwnCall };
    }

    // 4. Team Lead: Can view & listen ONLY to calls of counselors in their team(s)
    if (isTeamLead) {
      const isMyOwnCall =
        (callEmail && callEmail === myEmailLower) ||
        (myNamePrefix && resolvedCounselor.includes(myNamePrefix));

      if (isMyOwnCall) return { canView: true, canListen: true };

      const isMemberInMyTeam = myTeamMemberIdentifiers.some((identifier) => {
        return resolvedCounselor.includes(identifier) || (callEmail && callEmail.includes(identifier));
      });

      return { canView: isMemberInMyTeam, canListen: isMemberInMyTeam };
    }

    return { canView: true, canListen: true };
  };

  // Get unique list of counselor names for dropdown
  const uniqueCounselors = Array.from(
    new Set(
      callsList
        .map((c) => resolveCounselorName(c))
        .concat(counselorsList.map((c) => (c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.email?.split('@')[0])))
        .filter(Boolean)
    )
  );

  const displayedTeams = useMemo(() => {
    if (isTeamLead && myManagedTeams.length > 0) {
      return myManagedTeams.map((t) => t.name).filter(Boolean);
    }
    if (isCounselor) {
      return [];
    }

    const userCreatedTeams = teamsList.map((t) => t.name).filter(Boolean);
    const callTeams = callsList.map((c) => c.team || c.teamName || c.department).filter(Boolean);
    const counselorTeams = counselorsList.map((u) => u.team || u.teamName || u.department).filter(Boolean);
    const uniqueRealTeams = Array.from(new Set([...userCreatedTeams, ...callTeams, ...counselorTeams]));

    return uniqueRealTeams.filter(
      (name) =>
        name !== 'Global Sales' &&
        name !== 'NCLEX Counselors' &&
        name !== 'DHA Counselors' &&
        name !== 'Sales Team'
    );
  }, [isTeamLead, isCounselor, myManagedTeams, teamsList, callsList, counselorsList]);

  const displayedCounselors = useMemo(() => {
    if (isTeamLead) {
      return uniqueCounselors.filter((c) => {
        const cLower = c.toLowerCase();
        return myTeamMemberIdentifiers.some((id) => cLower.includes(id));
      });
    }
    if (isCounselor) {
      const myEmailLower = (userEmail || '').toLowerCase();
      const myNamePrefix = myEmailLower ? myEmailLower.split('@')[0] : '';
      const matched = uniqueCounselors.filter((c) => {
        const cLower = c.toLowerCase();
        return (
          (myNamePrefix && cLower.includes(myNamePrefix)) ||
          (myEmailLower && cLower.includes(myEmailLower)) ||
          (myNamePrefix && (myNamePrefix.includes('shris') || myNamePrefix.includes('shristi')) && (cLower.includes('shris') || cLower.includes('shristi')))
        );
      });
      return matched.length > 0 ? matched : [userEmail ? userEmail.split('@')[0] : 'My Calls'];
    }
    return uniqueCounselors;
  }, [isTeamLead, isCounselor, uniqueCounselors, myTeamMemberIdentifiers, userEmail]);

  // 1. Base Filter (Permissions, Message exclusion, Recordings query, Search Query, Date Range, Sales Rep / Team)
  const baseFilteredCalls = useMemo(() => {
    return callsList.filter((call) => {
      const { canView } = canUserAccessCall(call);
      if (!canView) return false;

      // 0. Exclude non-call text/chat message entries
      const combined = `${call.phoneNumber || ''} ${call.leadName || ''} ${call.disposition || ''}`.toLowerCase();
      if (combined.includes('message') || combined.includes('messages') || combined.includes('unread')) {
        return false;
      }

      // 0.5. Filter for recordings view if ?filter=recordings query param is active
      if (isRecordingsOnly) {
        const hasRecording = call.audioUrl || call.s3Key || call.recordingStatus === 'COMPLETED' || call.recordingStatus === 'PENDING_UPLOAD';
        if (!hasRecording || call.recordingStatus === 'NONE') {
          return false;
        }
      }

      // 1. Search Query Filter
      const phone = call.phoneNumber || call.phoneNumberMasked || call.phone || '';
      const name = call.leadName || call.name || '';
      const user = resolveCounselorName(call);
      const searchLower = searchQuery.toLowerCase();

      const matchesSearch =
        phone.toLowerCase().includes(searchLower) ||
        name.toLowerCase().includes(searchLower) ||
        user.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Date Range Filter
      if (dateRange !== 'All time') {
        const callDate = call.startTime ? new Date(call.startTime) : new Date();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        if (dateRange === 'Today') {
          const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          if (callDate < startOfToday || callDate > endOfToday) return false;
        } else if (dateRange === 'Yesterday') {
          const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
          const endOfYesterday = new Date(startOfToday.getTime() - 1);
          if (callDate < startOfYesterday || callDate > endOfYesterday) return false;
        } else if (dateRange === 'This week') {
          const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 86400000);
          if (callDate < sevenDaysAgo) return false;
        } else if (dateRange === 'This month') {
          const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 86400000);
          if (callDate < thirtyDaysAgo) return false;
        } else if (dateRange === 'Custom') {
          if (customStartDate) {
            const [sYear, sMonth, sDay] = customStartDate.split('-').map(Number);
            const startCustom = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
            if (callDate < startCustom) return false;
          }
          if (customEndDate) {
            const [eYear, eMonth, eDay] = customEndDate.split('-').map(Number);
            const endCustom = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
            if (callDate > endCustom) return false;
          }
        }
      }

      // 3. Select Sales Rep / Team Filter
      if (repCategory === 'Individual') {
        if (subFilter !== 'All Counselors') {
          if (user.toLowerCase() !== subFilter.toLowerCase()) {
            return false;
          }
        }
      } else if (repCategory === 'Teams') {
        if (subFilter !== 'All Teams') {
          const teamName = call.team || call.teamName || call.department || '';
          if (teamName && teamName.toLowerCase() !== subFilter.toLowerCase()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [callsList, isRecordingsOnly, searchQuery, dateRange, customStartDate, customEndDate, repCategory, subFilter, userEmail, isAdmin, isManager, isTeamLead, isCounselor, counselorsList]);

  // 2. Dynamic Summary Stats calculated from current active filters
  const callStats = useMemo(() => {
    let totalDurSec = 0;
    let answeredCount = 0;
    let shortCount = 0;
    let longCount = 0;
    let reviewedCount = 0;
    let withRecCount = 0;
    let waCount = 0;
    let simCount = 0;
    let mismatchCount = 0;

    baseFilteredCalls.forEach((c) => {
      const isAns = (c.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
      const dur = isAns ? Number(c.durationSeconds || 0) : 0;
      if (isAns) answeredCount++;
      totalDurSec += dur;
      if (isAns && dur > 0 && dur < 15) shortCount++;
      if (isAns && dur >= 300) longCount++;
      const hasRec = (c.audioUrl || c.s3Key || c.recordingStatus === 'COMPLETED' || c.recordingStatus === 'PENDING_UPLOAD') && c.recordingStatus !== 'NONE';
      if (hasRec) {
        withRecCount++;
        if (isCallDurationMismatch(c)) {
          mismatchCount++;
        }
      }
      if (c.rating || c.isBookmarked) reviewedCount++;

      const isWA = (c.channel || '').toUpperCase() === 'WHATSAPP' || (c.disposition || '').toLowerCase().includes('whatsapp') || (c.idempotencyKey || '').startsWith('WA_');
      if (isWA) waCount++; else simCount++;
    });

    const hours = Math.floor(totalDurSec / 3600);
    const mins = Math.floor((totalDurSec % 3600) / 60);

    return {
      totalCount: baseFilteredCalls.length,
      totalDurSec,
      totalTalkTimeStr: hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${totalDurSec % 60}s`,
      answeredCount,
      shortCount,
      longCount,
      reviewedCount,
      withRecCount,
      waCount,
      simCount,
      mismatchCount,
    };
  }, [baseFilteredCalls, audioCacheVer]);

  // 3. Final filtered calls with Anomaly / Category Tab selection applied
  const filteredCalls = useMemo(() => {
    return baseFilteredCalls.filter((call) => {
      if (anomalyFilter === 'short_calls') {
        const isAns = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
        const dur = isAns ? Number(call.durationSeconds || 0) : 0;
        if (!isAns || dur <= 0 || dur >= 15) return false;
      } else if (anomalyFilter === 'recordings') {
        const hasRec = (call.audioUrl || call.s3Key || call.recordingStatus === 'COMPLETED' || call.recordingStatus === 'PENDING_UPLOAD') && call.recordingStatus !== 'NONE';
        if (!hasRec) return false;
      } else if (anomalyFilter === 'long_calls') {
        const isAns = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
        const dur = isAns ? Number(call.durationSeconds || 0) : 0;
        if (!isAns || dur < 300) return false;
      } else if (anomalyFilter === 'whatsapp') {
        const isWA = (call.channel || '').toUpperCase() === 'WHATSAPP' || (call.disposition || '').toLowerCase().includes('whatsapp') || (call.idempotencyKey || '').startsWith('WA_');
        if (!isWA) return false;
      } else if (anomalyFilter === 'sim') {
        const isWA = (call.channel || '').toUpperCase() === 'WHATSAPP' || (call.disposition || '').toLowerCase().includes('whatsapp') || (call.idempotencyKey || '').startsWith('WA_');
        if (isWA) return false;
      } else if (anomalyFilter === 'mismatch') {
        if (!isCallDurationMismatch(call)) return false;
      } else if (anomalyFilter === 'bookmarked') {
        if (!call.isBookmarked && !call.rating) return false;
      }

      return true;
    });
  }, [baseFilteredCalls, anomalyFilter, audioCacheVer]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to Page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateRange, customStartDate, customEndDate, repCategory, subFilter, isRecordingsOnly, anomalyFilter]);

  type SortField = 'user' | 'phone' | 'name' | 'type' | 'startTime' | 'direction' | 'status' | 'duration' | 'audio';
  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'startTime' || field === 'duration' ? 'desc' : 'asc');
    }
  };

  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'user': {
          const uA = resolveCounselorName(a);
          const uB = resolveCounselorName(b);
          cmp = uA.localeCompare(uB);
          break;
        }
        case 'phone': {
          const pA = a.phoneNumber || a.phoneNumberMasked || a.phone || '';
          const pB = b.phoneNumber || b.phoneNumberMasked || b.phone || '';
          cmp = pA.localeCompare(pB);
          break;
        }
        case 'name': {
          const pA = a.phoneNumber || a.phoneNumberMasked || a.phone || '';
          const pB = b.phoneNumber || b.phoneNumberMasked || b.phone || '';
          const nA = a.leadName || a.name || pA;
          const nB = b.leadName || b.name || pB;
          cmp = nA.localeCompare(nB);
          break;
        }
        case 'type': {
          const isWAA = (a.channel || '').toUpperCase() === 'WHATSAPP' || (a.disposition || '').toLowerCase().includes('whatsapp') || (a.idempotencyKey || '').startsWith('WA_');
          const isWAB = (b.channel || '').toUpperCase() === 'WHATSAPP' || (b.disposition || '').toLowerCase().includes('whatsapp') || (b.idempotencyKey || '').startsWith('WA_');
          const tA = isWAA ? 'WhatsApp' : 'SIM';
          const tB = isWAB ? 'WhatsApp' : 'SIM';
          cmp = tA.localeCompare(tB);
          break;
        }
        case 'startTime': {
          const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
          const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
          cmp = timeA - timeB;
          break;
        }
        case 'direction': {
          const isOutA = (a.direction || 'OUTGOING').toUpperCase() === 'OUTGOING' || (a.direction || '').toUpperCase() === 'OUTBOUND';
          const isOutB = (b.direction || 'OUTGOING').toUpperCase() === 'OUTGOING' || (b.direction || '').toUpperCase() === 'OUTBOUND';
          const dA = isOutA ? 'Outbound' : 'Inbound';
          const dB = isOutB ? 'Outbound' : 'Inbound';
          cmp = dA.localeCompare(dB);
          break;
        }
        case 'status': {
          const isAnsA = (a.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const isAnsB = (b.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const sA = isAnsA ? 'Answered' : 'Unanswered';
          const sB = isAnsB ? 'Answered' : 'Unanswered';
          cmp = sA.localeCompare(sB);
          break;
        }
        case 'duration': {
          const isAnsA = (a.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const isAnsB = (b.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
          const durA = isAnsA ? Number(a.durationSeconds || 0) : 0;
          const durB = isAnsB ? Number(b.durationSeconds || 0) : 0;
          cmp = durA - durB;
          break;
        }
        case 'audio': {
          const hasA = a.audioUrl || a.s3Key || a.recordingStatus === 'COMPLETED' ? 1 : 0;
          const hasB = b.audioUrl || b.s3Key || b.recordingStatus === 'COMPLETED' ? 1 : 0;
          cmp = hasA - hasB;
          break;
        }
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredCalls, sortField, sortOrder]);

  const totalRecords = sortedCalls.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const paginatedCalls = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedCalls.slice(startIdx, startIdx + pageSize);
  }, [sortedCalls, currentPage, pageSize]);

  const renderSortHeader = (field: SortField, label: string, extraClasses = '') => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`p-4 text-center font-bold whitespace-nowrap cursor-pointer select-none group hover:bg-slate-100/70 transition-colors ${extraClasses}`}
        title={`Sort by ${label} (${isActive ? (sortOrder === 'asc' ? 'Ascending' : 'Descending') : 'Click to sort'})`}
      >
        <div className="flex items-center justify-center space-x-1.5">
          <span>{label}</span>
          <span className="inline-flex items-center">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-brand-600 font-extrabold transition-transform duration-200" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-brand-600 font-extrabold transition-transform duration-200" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 opacity-60 group-hover:opacity-100 transition-all duration-200" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const exportCSV = () => {
    if (sortedCalls.length === 0) {
      alert('No call records match the current filter selection to export.');
      return;
    }
    const headers = ['User', 'Phone Number', 'Name', 'Type', 'Call Time', 'Direction', 'Status', 'Duration'];
    const rows = sortedCalls.map((c) => {
      const isAns = (c.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
      const durSec = isAns ? Number(c.durationSeconds || 0) : 0;
      return [
        resolveCounselorName(c),
        c.phoneNumber || c.phoneNumberMasked || '',
        c.leadName || c.phoneNumber || '',
        c.channel === 'WHATSAPP' ? 'WhatsApp' : 'SIM',
        c.startTime ? new Date(c.startTime).toLocaleString() : '',
        c.direction || 'Outbound',
        isAns ? 'Answered' : 'Unanswered',
        durSec > 0 ? `${Math.floor(durSec / 60)}m:${durSec % 60}s` : '0s',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RecorderHub_Calls_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Navigation />

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto p-8 space-y-6 ${isPlayerVisible ? 'pb-36' : ''}`}>
        {/* Header Right Bar: Profile Menu */}
        <div className="flex items-center justify-end">
          <UserProfileMenu />
        </div>

        {/* Top Filter Toolbar (Matching Salestrail Screenshot) */}
        <div className="flex flex-wrap items-center space-x-6 text-xs font-semibold text-slate-700 pb-2">
          {/* Date Range Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-slate-900 font-bold text-sm">Date range</label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-2.5 pr-8 shadow-sm focus:outline-none min-w-[140px] cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="This week">This week</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This month">This month</option>
                  <option value="All time">All time</option>
                  <option value="Custom">Custom</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>

              {dateRange === 'Custom' && (
                <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">From:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500">To:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                      title="Clear custom dates"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Select Sales Reps Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-slate-900 font-bold text-sm">Select sales reps</label>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  value={repCategory}
                  onChange={(e) => handleRepCategoryChange(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-2.5 pr-8 shadow-sm focus:outline-none min-w-[140px] cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <option value="Teams">Teams</option>
                  <option value="Individual">Individual</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={subFilter}
                  onChange={(e) => setSubFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 text-slate-800 font-medium rounded-xl px-4 py-2.5 pr-8 shadow-sm focus:outline-none min-w-[160px] cursor-pointer hover:border-slate-300 transition-colors"
                >
                  {repCategory === 'Individual' ? (
                    <>
                      <option value="All Counselors">All Counselors</option>
                      {displayedCounselors.map((counselor) => (
                        <option key={counselor} value={counselor}>
                          {counselor}
                        </option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value="All Teams">All Teams</option>
                      {displayedTeams.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-end pt-5 space-x-3">
            <button
              onClick={exportCSV}
              className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Title & Search Bar */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {isRecordingsOnly ? 'Audio Recordings' : 'Calls'}
          </h1>

          {/* Search Box (Right Aligned) */}
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search name / number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Anomaly & Performance Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              onClick={() => setAnomalyFilter('all')}
              className={`px-3 py-1.5 rounded-xl border transition-all ${anomalyFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
            >
              All Calls ({callStats.totalCount})
            </button>

            <button
              onClick={() => setAnomalyFilter('short_calls')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition-all ${anomalyFilter === 'short_calls'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Short Calls &lt;15s ({callStats.shortCount})</span>
            </button>

            <button
              onClick={() => setAnomalyFilter('recordings')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition-all ${anomalyFilter === 'recordings'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>SIM Recordings ({callStats.withRecCount})</span>
            </button>

            <button
              onClick={() => setAnomalyFilter('sim')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition-all ${anomalyFilter === 'sim'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>SIM Only ({callStats.simCount})</span>
            </button>

            <button
              onClick={() => setAnomalyFilter('whatsapp')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition-all ${anomalyFilter === 'whatsapp'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Logs ({callStats.waCount})</span>
            </button>

            <button
              onClick={() => setAnomalyFilter('long_calls')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition-all ${anomalyFilter === 'long_calls'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Long Calls &gt;5m ({callStats.longCount})</span>
            </button>

            <button
              onClick={() => setAnomalyFilter('mismatch')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border transition-all ${anomalyFilter === 'mismatch'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`}
              title="Calls where call talk duration and recording audio duration do not match (ignoring calls without recordings)"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Duration Mismatch ({callStats.mismatchCount})</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600 px-2">
            <span className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Total Talk Time: <strong className="text-slate-900">{callStats.totalTalkTimeStr}</strong></span>
            </span>
          </div>
        </div>

        {/* Calls Table (Matching Salestrail Order) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 whitespace-nowrap">
              <thead className="bg-white text-slate-900 font-extrabold border-b border-slate-200">
                <tr>
                  {renderSortHeader('user', 'User', 'pl-6')}
                  {renderSortHeader('phone', 'Phone Number')}
                  {renderSortHeader('name', 'Name')}
                  {renderSortHeader('type', 'Type')}
                  {renderSortHeader('startTime', 'Call Time')}
                  {renderSortHeader('direction', 'Direction')}
                  {renderSortHeader('status', 'Status')}
                  {renderSortHeader('duration', 'Duration')}
                  {renderSortHeader('audio', 'Audio Recording', 'pr-6')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500 font-medium">
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                          <span>Syncing live call records from mobile...</span>
                        </div>
                      ) : (
                        <span>No {isRecordingsOnly ? 'recordings' : 'calls'} found matching filter. Make a call on your Android phone to log calls live!</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedCalls.map((call, idx) => {
                    const rawPhoneInput = call.phoneNumber || call.phoneNumberMasked || call.phone || '';
                    const digitsOnly = rawPhoneInput.replace(/\D/g, '');
                    const cleanPhone = digitsOnly.length >= 10 ? `+91 ${digitsOnly.slice(-10, -5)} ${digitsOnly.slice(-5)}` : (rawPhoneInput || '+91 99361 67436');
                    const contactName = call.leadName || call.name || cleanPhone;
                    const startTimeStr = call.startTime ? new Date(call.startTime).toLocaleString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }) : '08/08/2026 23:15:56';

                    const isAnswered = (call.status || 'ANSWERED').toUpperCase() === 'ANSWERED';
                    const effectiveDuration = isAnswered ? Number(call.durationSeconds || 0) : 0;
                    const durationMins = effectiveDuration > 0 ? Math.floor(effectiveDuration / 60) : 0;
                    const durationSecs = effectiveDuration > 0 ? effectiveDuration % 60 : 0;
                    const durationStr = isAnswered && effectiveDuration > 0
                      ? (durationMins > 0 ? (durationSecs > 0 ? `${durationMins}m ${durationSecs}s` : `${durationMins}m`) : `${durationSecs}s`)
                      : '0s';

                    const isOutbound = (call.direction || 'OUTGOING').toUpperCase() === 'OUTGOING' || (call.direction || '').toUpperCase() === 'OUTBOUND';
                    const isWhatsApp =
                      (call.channel || '').toUpperCase() === 'WHATSAPP' ||
                      (call.disposition || '').toLowerCase().includes('whatsapp') ||
                      (call.idempotencyKey || '').startsWith('WA_');

                    const isMismatchRow = isCallDurationMismatch(call);

                    const isThisRowActive = Boolean(currentCall && (
                      (currentCall._id && currentCall._id === call._id) ||
                      (currentCall.id && currentCall.id === call.id) ||
                      (currentCall.idempotencyKey && currentCall.idempotencyKey === call.idempotencyKey) ||
                      (currentCall.audioUrl && currentCall.audioUrl === call.audioUrl)
                    ));

                    return (
                      <tr 
                        key={call.id || call._id || idx} 
                        className={`transition-colors ${
                          isThisRowActive 
                            ? 'bg-rose-50/70 border-l-4 border-rose-500' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* User */}
                        <td className="p-4 pl-6 font-semibold text-slate-900 text-center whitespace-nowrap">
                          {resolveCounselorName(call)}
                        </td>
                        {/* Phone Number */}
                        <td className="p-4 text-center font-mono font-medium text-slate-900 whitespace-nowrap">
                          {cleanPhone}
                        </td>
                        {/* Name */}
                        <td className="p-4 text-center font-medium text-slate-800 whitespace-nowrap">
                          {contactName}
                        </td>
                        {/* Type */}
                        <td className="p-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${isWhatsApp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-800'
                            }`}>
                            {isWhatsApp ? 'WhatsApp' : 'SIM'}
                          </span>
                        </td>
                        {/* Call Time */}
                        <td className="p-4 text-center font-mono text-slate-700 text-[11px] whitespace-nowrap">
                          {startTimeStr}
                        </td>
                        {/* Direction */}
                        <td className="p-4 text-center font-medium text-slate-800 whitespace-nowrap">
                          {isOutbound ? 'Outbound' : 'Inbound'}
                        </td>
                        {/* Status */}
                        <td className="p-4 text-center font-medium text-slate-800 whitespace-nowrap">
                          {isAnswered ? 'Answered' : 'Unanswered'}
                        </td>
                        {/* Duration */}
                        <td className="p-4 text-center font-semibold text-slate-900 whitespace-nowrap">
                          {isAnswered && effectiveDuration > 0 && effectiveDuration < 15 ? (
                            <div className="flex items-center justify-center space-x-1.5 whitespace-nowrap">
                              <span className="text-amber-800 font-bold">{durationStr}</span>
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                title="Suspicious short call (< 15s) - click audio to audit pitch"
                              >
                                ⚠️ Short
                              </span>
                            </div>
                          ) : isMismatchRow ? (
                            <div className="flex items-center justify-center space-x-1.5 whitespace-nowrap">
                              <span className="text-red-700 font-bold">{durationStr}</span>
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-100 text-red-800 border border-red-300 shadow-2xs"
                                title="Duration mismatch: Call talk time and audio recording length do not match"
                              >
                                ⚠️ Mismatch
                              </span>
                            </div>
                          ) : (
                            <span className="whitespace-nowrap">{durationStr}</span>
                          )}
                        </td>

                        {/* Audio Recording */}
                        <td className="p-4 pr-6 text-center whitespace-nowrap">
                          <AudioCell call={call} idx={idx} canListen={canUserAccessCall(call).canListen} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-2.5 py-1 focus:outline-none shadow-xs cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-900">{totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
                <strong className="text-slate-900">{Math.min(currentPage * pageSize, totalRecords)}</strong> of{' '}
                <strong className="text-slate-900">{totalRecords}</strong> {isRecordingsOnly ? 'recordings' : 'calls'}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((pg) => pg === 1 || pg === totalPages || Math.abs(pg - currentPage) <= 1)
                  .map((pg, i, arr) => {
                    const prevPg = arr[i - 1];
                    const showEllipsis = prevPg && pg - prevPg > 1;
                    return (
                      <React.Fragment key={pg}>
                        {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                        <button
                          onClick={() => setCurrentPage(pg)}
                          className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentPage === pg
                              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pg}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Call Quality Coaching & Review Modal */}
        {reviewingCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Call Quality Coaching & Review</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {resolveCounselorName(reviewingCall)} • {reviewingCall.phoneNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingCall(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Star Rating */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sales Pitch Quality Rating</label>
                  <div className="flex items-center space-x-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                          star <= reviewRating ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-slate-500 ml-2">
                      {reviewRating === 5
                        ? '⭐⭐⭐⭐⭐ Excellent'
                        : reviewRating === 4
                        ? '⭐⭐⭐⭐ Good'
                        : reviewRating === 3
                        ? '⭐⭐⭐ Average'
                        : reviewRating === 2
                        ? '⭐⭐ Needs Coaching'
                        : reviewRating === 1
                        ? '⭐ Poor / Malworking'
                        : 'Unrated'}
                    </span>
                  </div>
                </div>

                {/* Quick Tag Pills */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quick Audit Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Great Pitch', 'Follow-up Needed', 'Price Objection', 'Rushed / Short', 'Misconduct / Flagged'].map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setReviewNotes((prev) => (prev ? `${prev}, ${tag}` : tag))}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
                        >
                          + {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Notes Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Manager Coaching Notes</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add coaching feedback, notes, or customer response details..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Bookmark Toggle */}
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={reviewBookmark}
                    onChange={(e) => setReviewBookmark(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">⭐ Bookmark as exemplary call for team library</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingCall(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReview}
                  disabled={savingReview}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingReview ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SalestrailCallsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans"><main className="flex-1 p-8">Loading calls...</main></div>}>
      <SalestrailCallsInner />
    </Suspense>
  );
}
