import React from 'react';
import { Mic, MicOff, Volume2, Pause, Sparkles, Terminal, Youtube, Search } from './icons.jsx';



export function MayaInteractiveAvatar({
  isSpeaking,
  isListening,
  isAgentLive = false,
  teacherName,
  teacherImage,
  subjectName,
  statusText,
  onToggleMic,
  onStopVoice,
  onPreviewVoice,
  onPreviewSecondaryVoice,
  secondaryVoiceLabel,
  onStartAgentVoice,
  onOpenYouTubeHUD,
  hasYouTubeVideo = true,
  activeTopic,
  activeVideoTitle,
  onRequestAccess,
  hasAccess = false
}) {
  // Determine dynamic HUD state color palette
  const stateColor = isSpeaking
    ? 'magenta'
    : isListening
      ? 'emerald'
      : isAgentLive
        ? 'amber'
        : 'cyan';

  return (
    <div className="relative w-full overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-950/90 via-[#070c1b]/95 to-slate-950/90">
      {/* Sci-Fi Scanline sweep */}
      <div className="scanline"></div>

      {/* Background Animated Radial Hologram Glow */}
      <div className={`absolute -inset-16 rounded-full blur-3xl transition-all duration-1000 pointer-events-none ${stateColor === 'magenta'
          ? 'bg-gradient-to-r from-rose-600/30 via-fuchsia-600/30 to-purple-600/30 opacity-100 scale-110'
          : stateColor === 'emerald'
            ? 'bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-cyan-500/30 opacity-100 scale-105'
            : stateColor === 'amber'
              ? 'bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-rose-500/30 opacity-100 scale-110'
              : 'bg-gradient-to-r from-cyan-600/20 via-indigo-600/20 to-purple-600/20 opacity-80 scale-100'
        }`}></div>

      {/* Futuristic Telemetry HUD Overlays (Desktop Flanks) */}
      <div className="hidden lg:flex absolute left-6 top-6 flex-col items-start text-left font-mono text-[10px] text-cyan-400/80 space-y-1 select-none pointer-events-none">
        <div className="flex items-center gap-1.5 text-cyan-300 font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
          JARVIS CORE v4.8
        </div>
        <div>DSP FREQ: 48.0 kHz</div>
        <div>AUDIO LATENCY: 8ms</div>
        <div className="text-slate-400">FACULTY: {teacherName.split(' ')[0]}</div>
      </div>

      <div className="hidden lg:flex absolute right-6 top-6 flex-col items-end text-right font-mono text-[10px] text-purple-400/80 space-y-1 select-none pointer-events-none">
        <div className="flex items-center gap-1.5 text-purple-300 font-bold tracking-wider">
          MAYA NEURAL SYNC
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
        </div>
        <div>ELEVENLABS: {isAgentLive ? 'LIVE WEBRTC' : 'READY'}</div>
        <div>YOUTUBE HUD: SYNCED</div>
        <div className="text-emerald-400">STATUS: 100% ONLINE</div>
      </div>

      {/* JARVIS / MAYA Arc Reactor Core */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Ring 4: Outermost Degree Tick Marks (JARVIS Reticle) */}
        <div className="absolute -inset-14 sm:-inset-16 rounded-full border border-dashed border-cyan-500/20 animate-jarvis-spin pointer-events-none">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono text-cyan-400/60 font-bold">000Â°</div>
          <div className="absolute top-1/2 -right-3 -translate-y-1/2 text-[8px] font-mono text-cyan-400/60 font-bold">090Â°</div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-mono text-cyan-400/60 font-bold">180Â°</div>
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 text-[8px] font-mono text-cyan-400/60 font-bold">270Â°</div>
        </div>

        {/* Ring 3: Counter-rotating Cyber Targeting Arcs */}
        <div className={`absolute -inset-10 sm:-inset-12 rounded-full border-2 border-dashed transition-all duration-700 pointer-events-none animate-jarvis-reverse-spin ${stateColor === 'magenta'
            ? 'border-rose-500/50 shadow-lg shadow-rose-500/20'
            : stateColor === 'emerald'
              ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20'
              : stateColor === 'amber'
                ? 'border-amber-500/50 shadow-lg shadow-amber-500/20'
                : 'border-cyan-500/40 shadow-lg shadow-cyan-500/20'
          }`}></div>

        {/* Ring 2: Pulsing Energy Shockwave */}
        <div className={`absolute -inset-5 sm:-inset-6 rounded-full border transition-all duration-700 pointer-events-none animate-pulse ${stateColor === 'magenta'
            ? 'border-purple-500/60 shadow-xl shadow-purple-500/30'
            : stateColor === 'emerald'
              ? 'border-teal-500/60 shadow-xl shadow-teal-500/30'
              : stateColor === 'amber'
                ? 'border-orange-500/60 shadow-xl shadow-orange-500/30'
                : 'border-indigo-500/40 shadow-xl shadow-indigo-500/20'
          }`}></div>

        {/* Ring 1: Aura Ring */}
        <div className={`absolute -inset-1.5 rounded-full transition-all duration-500 blur-sm pointer-events-none ${stateColor === 'magenta'
            ? 'bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-purple-600 opacity-90'
            : stateColor === 'emerald'
              ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 opacity-90'
              : stateColor === 'amber'
                ? 'bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 opacity-90'
                : 'bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 opacity-70'
          }`}></div>

        {/* Avatar Image in Circular Cyber Aperture */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden p-1.5 bg-slate-950 shadow-2xl">
          <img
            src={teacherImage}
            alt={teacherName}
            className={`w-full h-full object-cover rounded-full transition-transform duration-700 ${isSpeaking ? 'scale-105' : 'scale-100'
              }`}
          />
        </div>

        {/* Holographic Status Badge below Avatar */}
        <div className="absolute -bottom-3 inset-x-0 flex justify-center z-10">
          {isSpeaking ? (
            <div className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 px-3.5 py-1.5 rounded-full border border-white/30 shadow-xl shadow-rose-950/60 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-3 bg-white rounded-full eq-bar"></span>
              <span className="w-1.5 h-4 bg-white rounded-full eq-bar"></span>
              <span className="w-1.5 h-2 bg-white rounded-full eq-bar"></span>
              <span className="w-1.5 h-4 bg-white rounded-full eq-bar"></span>
              <span className="text-[10px] font-black text-white tracking-widest ml-1 uppercase">MAYA TRANSMITTING</span>
            </div>
          ) : isListening ? (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 rounded-full border border-emerald-300/40 shadow-xl shadow-emerald-950/60 flex items-center gap-1.5 animate-pulse">
              <Mic className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">JARVIS LISTENING</span>
            </div>
          ) : isAgentLive ? (
            <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 px-3.5 py-1.5 rounded-full border border-amber-300/40 shadow-xl shadow-amber-950/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin" />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">AUTONOMOUS VOICE AGENT</span>
            </div>
          ) : (
            <div className="bg-slate-900/90 px-3.5 py-1 rounded-full border border-cyan-500/40 shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[10px] font-bold text-cyan-300 tracking-wider">JARVIS // READY</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Soundwave Oscilloscope Display */}
      <div className="w-full max-w-md h-7 flex items-center justify-center gap-1 my-2 px-6">
        {[4, 8, 14, 22, 10, 26, 16, 28, 12, 20, 30, 18, 24, 12, 28, 15, 22, 9, 17, 7, 12].map((height, i) => (
          <span
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${isSpeaking
                ? 'bg-gradient-to-t from-rose-500 to-purple-400 eq-bar'
                : isListening
                  ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 eq-bar'
                  : 'bg-cyan-500/20'
              }`}
            style={{
              height: isSpeaking || isListening ? `${height}px` : '4px',
              animationDelay: `${(i % 5) * 0.1}s`
            }}
          />
        ))}
      </div>

      {/* Teacher & Subject Metadata with Sci-Fi Hologram Typography */}
      <div className="relative z-10 max-w-xl space-y-2 mt-1">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>{subjectName} AI Holographic Console</span>
          </div>

          {activeTopic && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
              <span>Topic: <strong>{activeTopic}</strong></span>
            </div>
          )}

          {activeVideoTitle && onOpenYouTubeHUD && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={onOpenYouTubeHUD}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-105"
                title="Watch topic lecture video in HUD"
              >
                <Youtube className="w-3.5 h-3.5 text-rose-400" />
                <span className="truncate max-w-[200px]">Lecture: {activeVideoTitle}</span>
              </button>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent((activeTopic || subjectName) + ' full tutorial best')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-300 text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-105"
                title="Shift to YouTube Search to find best videos"
              >
                <Search className="w-3.5 h-3.5 text-indigo-400" />
                <span>Search on YouTube â†—</span>
              </a>
            </div>
          )}
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          {teacherName}
        </h3>

        {/* Dynamic Status Readout */}
        <div className="text-xs sm:text-sm text-slate-300 min-h-[38px] flex items-center justify-center px-4">
          {isSpeaking ? (
            <span className="text-purple-300 font-medium animate-pulse flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-purple-400 animate-bounce" />
              {teacherName} is explaining in studio-cleared voice...
            </span>
          ) : isListening ? (
            <span className="text-emerald-400 font-medium flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              JARVIS is processing your query... Speak naturally!
            </span>
          ) : (
            <span className="text-slate-400">{statusText || "Tap the microphone below or launch YouTube lecture theatre."}</span>
          )}
        </div>

        {/* Voice & Microphone Access Grant Banner */}
        {onRequestAccess && !hasAccess && (
          <div className="w-full max-w-md mx-auto my-2 p-2.5 rounded-2xl bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-cyan-900/60 border border-cyan-400/50 shadow-xl flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <div>
                <div className="text-xs font-bold text-white">Enable Live Voice & Microphone</div>
                <div className="text-[10px] text-cyan-200">Allow audio access to talk directly with {teacherName}</div>
              </div>
            </div>
            <button
              onClick={onRequestAccess}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              Grant Access ðŸŽ™ï¸
            </button>
          </div>
        )}

        {/* Multi-Button Holographic Action Hub */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          {/* YouTube HUD Theatre Launcher Button */}
          {onOpenYouTubeHUD && hasYouTubeVideo && (
            <>
              <button
                onClick={onOpenYouTubeHUD}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-950/60 hover:scale-105 transition-all cursor-pointer border border-rose-400/30"
              >
                <Youtube className="w-4 h-4 text-white" />
                <span>Watch {activeTopic ? `${activeTopic} Video` : "YouTube Lecture"}</span>
              </button>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent((activeTopic || subjectName) + ' ' + teacherName + ' best tutorial')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-950/40 hover:scale-105 transition-all cursor-pointer"
                title="Shift this topic to YouTube Search for top-rated videos"
              >
                <Search className="w-4 h-4 text-rose-400" />
                <span>Search Best Videos ðŸ”</span>
              </a>
            </>
          )}

          {/* Autonomous Live Voice Conversation Agent Toggle */}
          {onStartAgentVoice && (
            <button
              onClick={onStartAgentVoice}
              className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${isAgentLive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/40'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 hover:scale-105 border border-emerald-400/30'
                }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{isAgentLive ? 'End Voice Conversation' : 'Talk with Teacher (Live Voice)'}</span>
            </button>
          )}

          {/* Tap to Talk Mic Button */}
          <button
            onClick={onToggleMic}
            className={`px-5 py-3 rounded-2xl font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg ${isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30 hover:scale-105 border border-purple-400/30'
              }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{isListening ? 'Stop Listening' : 'Tap to Talk (Live Mic)'}</span>
          </button>

          {/* Teacher Master Audio Preview */}
          {isSpeaking ? (
            <button
              onClick={onStopVoice}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <Pause className="w-4 h-4" />
              <span>Pause Voice</span>
            </button>
          ) : (
            <>
              <button
                onClick={onPreviewVoice}
                className="px-4 py-3 rounded-2xl bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 font-semibold text-xs flex items-center gap-2 cursor-pointer border border-cyan-700/60 transition-all hover:scale-105"
              >
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Play {teacherName.split(' ')[0]}'s Voice</span>
              </button>

              {onPreviewSecondaryVoice && (
                <button
                  onClick={onPreviewSecondaryVoice}
                  className="px-4 py-3 rounded-2xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 font-semibold text-xs flex items-center gap-2 cursor-pointer border border-purple-700/60 transition-all hover:scale-105"
                >
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  <span>{secondaryVoiceLabel || "Play Second Voice"}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};




