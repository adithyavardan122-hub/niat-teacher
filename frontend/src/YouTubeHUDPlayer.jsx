import React, { useState } from 'react';
import { Youtube, Play, Maximize2, Minimize2, SkipForward, Sparkles, Radio, Search, ExternalLink } from './icons.jsx';
import { fallbackSubjects } from './data.js';



export function YouTubeHUDPlayer({
  video,
  subjectVideos,
  isOpen,
  onClose,
  onSelectVideo,
  teacherName,
  isAgentControlled = true
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState('video');

  if (!isOpen || !video) return null;

  const currentIndex = subjectVideos.findIndex(v => v.id === video.id);

  const handleNextVideo = () => {
    if (currentIndex < subjectVideos.length - 1) {
      onSelectVideo(subjectVideos[currentIndex + 1]);
    } else if (subjectVideos.length > 0) {
      onSelectVideo(subjectVideos[0]);
    }
  };

  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      onSelectVideo(subjectVideos[currentIndex - 1]);
    } else if (subjectVideos.length > 0) {
      onSelectVideo(subjectVideos[subjectVideos.length - 1]);
    }
  };

  const directWatchUrl = `https://www.youtube.com/watch?v=${video.youtubeId}`;
  const bestSearchQuery = video.searchQuery || `${video.topic} full tutorial best`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(bestSearchQuery)}`;

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-out ${
      isMaximized 
        ? 'inset-2 sm:inset-6 flex flex-col' 
        : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[560px] max-h-[88vh]'
    }`}>
      {/* Sci-Fi Holographic HUD Container */}
      <div className="relative w-full h-full flex flex-col rounded-3xl glass-panel border border-cyan-500/50 shadow-2xl shadow-cyan-950/60 overflow-hidden bg-slate-950/95 backdrop-blur-2xl">
        {/* Holographic animated scanline */}
        <div className="scanline"></div>

        {/* HUD Top Bar Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900/90 via-cyan-950/40 to-slate-900/90 border-b border-cyan-500/30 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 relative"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-cyan-300 uppercase flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-rose-500" />
                  JARVIS AI YouTube Theatre
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-mono">
                  HUD v3.5
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                AGENT DIRECT STREAM // {teacherName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Playlist toggle */}
            <button
              onClick={() => setActiveTab(activeTab === 'video' ? 'playlist' : 'video')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                activeTab === 'playlist'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800/80 text-cyan-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Playlist ({subjectVideos.length})
            </button>

            {/* Maximize / Minimize toggle */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
              title={isMaximized ? "Restore view" : "Maximize view"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white transition-colors cursor-pointer"
              title="Close Player"
            >
              âœ•
            </button>
          </div>
        </div>

        {/* DIRECT YOUTUBE ACCESS & SEARCH CONTROL STRIP */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border-b border-rose-500/30 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-rose-200 flex items-center gap-1">
              <Youtube className="w-3.5 h-3.5 text-rose-400" />
              Direct YouTube Access:
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Watch Button on YouTube */}
            <a
              href={directWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              title="Watch directly on YouTube"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Watch on YouTube â†—</span>
            </a>

            {/* Shift to YouTube Search for Best Videos */}
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
              title="Shift to YouTube Search to find the best videos on this topic"
            >
              <Search className="w-3 h-3 text-purple-200" />
              <span>Search Best Videos ðŸ”</span>
            </a>
          </div>
        </div>

        {/* Video or Playlist Content */}
        {activeTab === 'video' ? (
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Embedded Responsive YouTube IFrame with Fallback Notice */}
            <div className={`relative w-full ${isMaximized ? 'flex-1 min-h-[350px]' : 'aspect-video'} bg-black group`}>
              <iframe
                src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Floating Quick Action overlay in case embed is blocked */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                <a
                  href={directWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded bg-black/80 hover:bg-rose-600 text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur border border-white/20 transition-all"
                >
                  <ExternalLink className="w-2.5 h-2.5" /> Open App
                </a>
              </div>
            </div>

            {/* Telemetry and Video Details */}
            <div className="p-4 space-y-3 bg-slate-950/90 border-t border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      {video.topic}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      â± {video.duration}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Faculty: {video.facultyName}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{video.title}</h4>
                </div>
              </div>

              {/* Fast Shift to YouTube Search Chips */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Search className="w-3 h-3 text-cyan-400" />
                    Shift this topic into YouTube Search:
                  </span>
                  <span className="text-cyan-400 font-mono">1-Click YouTube Access</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.topic + ' full tutorial best')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 border border-slate-700 hover:border-rose-500 transition-all cursor-pointer"
                  >
                    â–¶ Best Full Tutorial
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.topic + ' one shot video')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 border border-slate-700 hover:border-rose-500 transition-all cursor-pointer"
                  >
                    âš¡ One-Shot Lecture
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.topic + ' interview questions practice')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 border border-slate-700 hover:border-rose-500 transition-all cursor-pointer"
                  >
                    ðŸŽ¯ Placement & Interview Q&A
                  </a>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.topic + ' coding practice walkthrough')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 border border-slate-700 hover:border-rose-500 transition-all cursor-pointer"
                  >
                    ðŸ’» Hands-on Walkthrough
                  </a>
                </div>
              </div>

              {/* Agent Commentary pill & Nav Controls */}
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between gap-2 text-xs text-cyan-200">
                <span className="flex items-center gap-1.5 font-medium text-[11px] truncate">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                  <span className="truncate">{isAgentControlled ? `${teacherName}: "Synchronized to current doubt topic."` : 'Autonomous YouTube Stream'}</span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handlePrevVideo}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                  >
                    Prev
                  </button>
                  <button
                    onClick={handleNextVideo}
                    className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] flex items-center gap-1 shadow cursor-pointer transition-all"
                  >
                    Next <SkipForward className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {video.summary}
              </p>
            </div>
          </div>
        ) : (
          /* Subject Video Playlist view */
          <div className="flex-1 p-4 overflow-y-auto space-y-2.5 bg-slate-950/90">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                Subject Video Curations ({subjectVideos.length})
              </span>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(teacherName + ' complete course playlist')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Youtube className="w-3 h-3 text-rose-500" /> Search Full Course on YouTube â†—
              </a>
            </div>

            {subjectVideos.map((item, idx) => {
              const isSelected = item.id === video.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectVideo(item);
                    setActiveTab('video');
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isSelected ? <Play className="w-3.5 h-3.5 fill-current" /> : (idx + 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold text-cyan-400 truncate">{item.topic}</span>
                        <span className="text-[10px] text-slate-500 font-mono">â± {item.duration}</span>
                      </div>
                      <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                    </div>
                  </div>

                  <a
                    href={`https://www.youtube.com/watch?v=${item.youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/50 text-[10px] font-bold flex items-center gap-1 transition-all shrink-0"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* HUD Telemetry Footer Bar */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            NEURAL HUD: ONLINE
          </span>
          <a
            href={youtubeSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-400 hover:underline flex items-center gap-1"
          >
            <Youtube className="w-3 h-3" /> Shift Active Topic to YouTube â†—
          </a>
        </div>
      </div>
    </div>
  );
};





