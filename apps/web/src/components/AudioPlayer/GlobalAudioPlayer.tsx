'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAudioPlayer, PlaybackSpeed } from '@/contexts/AudioPlayerContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Download, 
  X, 
  Keyboard, 
  Sliders, 
  Smartphone, 
  MessageSquare,
  Clock,
  User,
  ChevronUp,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function GlobalAudioPlayer() {
  const {
    currentCall,
    audioSrc,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackSpeed,
    volume,
    isMuted,
    isPlayerVisible,
    hotkeyNotification,
    togglePlay,
    seek,
    skip,
    setSpeed,
    cycleSpeed,
    setVolume,
    toggleMute,
    closePlayer,
  } = useAudioPlayer();

  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPositionX, setHoverPositionX] = useState<number>(0);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  if (!isPlayerVisible || !currentCall || !audioSrc) {
    return null;
  }

  const rawPhone = currentCall.phoneNumber || currentCall.phone || '';
  const cleanDigits = rawPhone.replace(/\D/g, '').slice(-10) || 'Contact';
  const contactName = currentCall.leadName || currentCall.name || cleanDigits;
  const counselorName = currentCall.agentName || currentCall.counselorName || currentCall.counselorEmail || currentCall.userEmail || 'Counselor';
  const isWhatsApp =
    (currentCall.channel || '').toUpperCase() === 'WHATSAPP' ||
    (currentCall.disposition || '').toLowerCase().includes('whatsapp') ||
    (currentCall.idempotencyKey || '').startsWith('WA_');

  const recordDate = currentCall.startTime ? new Date(currentCall.startTime) : new Date();
  const dateFormatted = recordDate.toISOString().slice(0, 10);
  const timeFormatted = recordDate.toTimeString().slice(0, 8).replace(/:/g, '-');
  const safeContactForFile = contactName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const downloadFileName = `Recording_${safeContactForFile}_${cleanDigits}_${dateFormatted}_${timeFormatted}.m4a`;

  const effectiveDuration = duration || currentCall.durationSeconds || 0;
  const progressPercent = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || effectiveDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(clickRatio * effectiveDuration);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || effectiveDuration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, moveX / rect.width));
    setHoverPositionX(moveX);
    setHoverTime(ratio * effectiveDuration);
  };

  const speedOptions: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5, 2];

  return (
    <>
      {/* Hotkey Action Notification Toast */}
      {hotkeyNotification && (
        <div className="fixed bottom-28 right-6 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xl border border-rose-500/30 flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>{hotkeyNotification}</span>
          </div>
        </div>
      )}

      {/* Hotkeys Cheatsheet Modal */}
      {showHotkeysModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Keyboard className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Audio Player Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={() => setShowHotkeysModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                <span className="text-slate-300">Play / Pause Recording</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-rose-400 font-mono font-bold shadow-xs">Space</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                <span className="text-slate-300">Skip Backward 10 Seconds</span>
                <div className="flex items-center space-x-1 font-mono font-bold">
                  <kbd className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-200">J</kbd>
                  <span className="text-slate-500">or</span>
                  <kbd className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-200">←</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                <span className="text-slate-300">Skip Forward 10 Seconds</span>
                <div className="flex items-center space-x-1 font-mono font-bold">
                  <kbd className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-200">L</kbd>
                  <span className="text-slate-500">or</span>
                  <kbd className="px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-200">→</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                <span className="text-slate-300">Decrease Speed (0.75x - 2x)</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono font-bold">[</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                <span className="text-slate-300">Increase Speed (0.75x - 2x)</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono font-bold">]</kbd>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-800">
                <span className="text-slate-300">Mute / Unmute Audio</span>
                <kbd className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 font-mono font-bold">M</kbd>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Continuous Playback:</strong> Audio keeps playing seamlessly as you navigate between Calls, Analytics, and Team Management.
            </p>

            <button
              onClick={() => setShowHotkeysModal(false)}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Global Sticky Bottom Player Bar */}
      <aside 
        aria-label="Audio Recording Player"
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl text-white transition-all select-none"
      >
        {/* Interactive Scrub Progress Bar with Hover Tooltip */}
        <div 
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarMouseMove}
          onMouseEnter={() => setIsHoveringProgress(true)}
          onMouseLeave={() => {
            setIsHoveringProgress(false);
            setHoverTime(null);
          }}
          className="relative h-2 bg-slate-800 hover:h-3 transition-all cursor-pointer group"
          title="Click to seek"
        >
          {/* Progress Filled */}
          <div 
            className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber Knob */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform -mr-1.5" />
          </div>

          {/* Hover Time Tooltip Indicator */}
          {isHoveringProgress && hoverTime !== null && (
            <div 
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-white shadow-lg pointer-events-none"
              style={{ left: `${hoverPositionX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          
          {/* Left: Call / Contact Details */}
          <div className="flex items-center space-x-3.5 min-w-0 max-w-[280px] sm:max-w-xs md:max-w-sm">
            {/* Animated Equalizer or Channel Icon */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                {isPlaying ? (
                  <div className="flex items-end space-x-0.5 h-4">
                    <span className="w-1 bg-rose-400 rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-4" />
                    <span className="w-1 bg-rose-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-2.5" />
                    <span className="w-1 bg-rose-400 rounded-full animate-[bounce_0.5s_ease-in-out_infinite] h-3.5" />
                    <span className="w-1 bg-rose-400 rounded-full animate-[bounce_0.7s_ease-in-out_infinite] h-1.5" />
                  </div>
                ) : (
                  <Play className="w-4 h-4 ml-0.5 text-rose-400" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-white truncate hover:underline" title={contactName}>
                  {contactName}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                  isWhatsApp 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {isWhatsApp ? 'WhatsApp' : 'SIM'}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400 truncate">
                <span className="font-mono text-slate-300">{cleanDigits}</span>
                <span>•</span>
                <span className="truncate text-slate-400" title={`Counselor: ${counselorName}`}>
                  {counselorName}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Controls & Time Display */}
          <div className="flex flex-col items-center space-y-1 flex-1 max-w-md">
            <div className="flex items-center space-x-4">
              {/* Skip -10s */}
              <button
                onClick={() => skip(-10)}
                title="Skip back 10s (J or ←)"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative group"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[8px] font-mono absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-70 group-hover:opacity-100">-10s</span>
              </button>

              {/* Main Play / Pause Button */}
              <button
                onClick={togglePlay}
                disabled={isLoading}
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              {/* Skip +10s */}
              <button
                onClick={() => skip(10)}
                title="Skip forward 10s (L or →)"
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative group"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[8px] font-mono absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-70 group-hover:opacity-100">+10s</span>
              </button>
            </div>

            {/* Timestamps */}
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 pt-1">
              <span className="text-white font-semibold">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          {/* Right: Actions, Speed, Volume, Shortcuts */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Speed Pill with Dropdown */}
            <div className="relative">
              <button
                onClick={() => cycleSpeed('next')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowSpeedMenu(!showSpeedMenu);
                }}
                title="Playback Speed (Click to cycle, or use [ and ])"
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-rose-400 hover:text-rose-300 transition-colors shadow-2xs flex items-center space-x-1"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{playbackSpeed}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-slate-900 border border-slate-700 rounded-xl py-1 shadow-2xl z-50 min-w-[90px]">
                  {speedOptions.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        setSpeed(spd);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors flex items-center justify-between ${
                        playbackSpeed === spd ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{spd}x</span>
                      {playbackSpeed === spd && <span className="text-rose-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center space-x-1.5 group">
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-800 accent-rose-500 rounded-lg cursor-pointer"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>

            {/* Download Recording */}
            <a
              href={audioSrc}
              download={downloadFileName}
              title={`Download audio file: ${downloadFileName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Hotkey Help Button */}
            <button
              onClick={() => setShowHotkeysModal(true)}
              title="Keyboard Shortcuts Cheatsheet"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Close / Dismiss Player */}
            <button
              onClick={closePlayer}
              title="Close Player"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
