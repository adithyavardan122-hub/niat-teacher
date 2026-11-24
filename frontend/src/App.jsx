import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Mic, MicOff, Volume2, Send, Upload, Sparkles,
  ChevronRight, ArrowLeft, Code, Play, Pause, ShieldCheck,
  RefreshCw, Flame, Terminal, Download, ExternalLink, MessageSquare, Youtube, Search,
  Phone, User, Lock, LogOut, Database, IdCard
} from './icons.jsx';
import { fallbackSubjects } from './data.js';
import { voiceEnhancer, speakWithClonedTeacherVoice } from './audioEnhancer.js';
import { AIAgentTeacherEngine } from './aiAgentEngine.js';
import { MayaInteractiveAvatar } from './MayaAvatar.jsx';
import { YouTubeHUDPlayer } from './YouTubeHUDPlayer.jsx';
import { StudentLogin } from './StudentLogin.jsx';

import { generateElevenLabsSpeech, cloneVoiceWithAudio } from './elevenLabsService.js';
import { elevenLabsAgent } from './elevenLabsAgent.js';






const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSection, setSelectedSection] = useState('HTML');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [, setIsPlayingAudio] = useState(false);
  const [isTeacherSpeaking, setIsTeacherSpeaking] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [activeYouTubeVideo, setActiveYouTubeVideo] = useState(null);
  const [isYouTubeHUDOpen, setIsYouTubeHUDOpen] = useState(false);
  const [isAgentSessionLive, setIsAgentSessionLive] = useState(false);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [syllabusSearch, setSyllabusSearch] = useState('');

  // Admin states
  const [adminSelectedSubject, setAdminSelectedSubject] = useState('programming');
  const [adminTeacherName, setAdminTeacherName] = useState('');
  const [adminTeacherRole, setAdminTeacherRole] = useState('');
  const [adminTeacherImage, setAdminTeacherImage] = useState('');
  const [adminVoiceName, setAdminVoiceName] = useState('');
  const [adminVoiceId, setAdminVoiceId] = useState('');
  const [adminAgentId, setAdminAgentId] = useState('agent_2001m787qgn3fbnag9rvn4rvb72x');
  const [adminAudioSampleUrl, setAdminAudioSampleUrl] = useState('');
  const [adminCloningModal, setAdminCloningModal] = useState(false);
  const [cloningStatus, setCloningStatus] = useState(null);
  const [testTtsStatus, setTestTtsStatus] = useState(null);
  const [adminSaveStatus, setAdminSaveStatus] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(() => {
    return localStorage.getItem('niat_elevenlabs_key') || (import.meta.env.VITE_ELEVENLABS_API_KEY || '');
  });
  const [llmApiKey, setLlmApiKey] = useState(() => {
    return localStorage.getItem('niat_llm_key') || 
           (import.meta.env.VITE_GEMINI_API_KEY || 
            import.meta.env.VITE_GROQ_API_KEY || 
            import.meta.env.VITE_OPENAI_API_KEY || '');
  });
  const [llmProvider, setLlmProvider] = useState(() => {
    return localStorage.getItem('niat_llm_provider') || 'pollinations';
  });

  // Student Authentication state (persisted in localStorage)
  const [currentStudent, setCurrentStudent] = useState(() => {
    try {
      const saved = localStorage.getItem('niat_student');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (student) => {
    setCurrentStudent(student);
    try {
      localStorage.setItem('niat_student', JSON.stringify(student));
    } catch (e) {
      console.warn('Could not save student to localStorage', e);
    }
    setActiveTab('subjects');
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    try {
      localStorage.removeItem('niat_student');
    } catch (e) {
      console.warn('Could not clear localStorage', e);
    }
    setActiveTab('landing');
  };


  const populateAdminForm = (s) => {
    setAdminSelectedSubject(s.id);
    setAdminTeacherName(s.teacherName);
    setAdminTeacherRole(s.teacherRole);
    setAdminTeacherImage(s.teacherImage);
    setAdminVoiceName(s.voiceConfig?.voiceName || '');
    setAdminVoiceId(s.voiceConfig?.voiceId || '');
    setAdminAgentId(s.voiceConfig?.agentId || 'agent_2001m787qgn3fbnag9rvn4rvb72x');
    setAdminAudioSampleUrl(s.voiceConfig?.audioSampleUrl || '/uploads/audio/teacher_agent_voice.mp3');
    setAdminSaveStatus('');
    setCloningStatus(null);
    setTestTtsStatus(null);
  };


  const handleSelectTopicSection = (sec, currentSubject) => {
    setSelectedSection(sec);
    const targetSub = currentSubject || selectedSubject;
    if (targetSub?.youtubeVideos && targetSub.youtubeVideos.length > 0) {
      const secNorm = sec.toLowerCase().trim();
      const matched = targetSub.youtubeVideos.find(v => {
        const topNorm = v.topic.toLowerCase().trim();
        return topNorm === secNorm || topNorm.includes(secNorm) || secNorm.includes(topNorm);
      }) || targetSub.youtubeVideos[0];
      if (matched) {
        setActiveYouTubeVideo(matched);
      }
    }
  };

  const stopTeacherVoice = () => {
    voiceEnhancer.stop();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
    setIsTeacherSpeaking(false);
  };

  const speakTeacherText = (text, onEnd) => {
    stopTeacherVoice();
    setIsPlayingAudio(true);
    setIsTeacherSpeaking(true);

    const success = speakWithClonedTeacherVoice(
      text,
      selectedSubject?.id || 'programming',
      () => {
        setIsPlayingAudio(true);
        setIsTeacherSpeaking(true);
      },
      () => {
        setIsPlayingAudio(false);
        setIsTeacherSpeaking(false);
        onEnd?.();
        if (isVoiceChatActive) {
          setTimeout(() => handleStartListening(), 400);
        }
      }
    );

    if (!success) {
      setIsPlayingAudio(false);
      setIsTeacherSpeaking(false);
      onEnd?.();
    }
  };

  const playTeacherAudio = (url, fallbackText, onEnd) => {
    stopTeacherVoice();
    setIsPlayingAudio(true);
    setIsTeacherSpeaking(true);

    voiceEnhancer.playAudio(
      url,
      () => {
        setIsPlayingAudio(true);
        setIsTeacherSpeaking(true);
      },
      () => {
        setIsPlayingAudio(false);
        setIsTeacherSpeaking(false);
        onEnd?.();
        if (isVoiceChatActive) {
          setTimeout(() => handleStartListening(), 400);
        }
      }
    ).catch(err => {
      console.warn('Direct audio play failed or blocked, falling back to speech synthesis:', err);
      if (fallbackText) {
        speakTeacherText(fallbackText, onEnd);
      } else {
        setIsPlayingAudio(false);
        setIsTeacherSpeaking(false);
        onEnd?.();
      }
    });
  };

  const playTeacherVoice = (url, textToSpeak) => {
    if (url) {
      playTeacherAudio(url, textToSpeak);
    } else if (textToSpeak) {
      speakTeacherText(textToSpeak);
    } else {
      const sampleUrl = selectedSubject?.voiceConfig?.audioSampleUrl || '/uploads/audio/sujan_sir_cleared_voice.mp3';
      playTeacherAudio(sampleUrl);
    }
  };

  const handleStartListening = () => {
    if (isRecording) return;
    voiceEnhancer.unlockAudio();
    stopTeacherVoice();

    const SpeechRecognition = (window).SpeechRecognition || (window).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge to speak with the teacher.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      setIsRecording(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
        if (transcript && transcript.trim()) {
          setTimeout(() => {
            handleSendMessage(transcript);
          }, 150);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
      setIsRecording(false);
    }
  };

  const handleRequestAccess = async () => {
    try {
      voiceEnhancer.unlockAudio();
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      }
      setHasAudioAccess(true);
      speakTeacherText(`Microphone and voice access granted. I am ${selectedSubject?.teacherName || 'your faculty'}. I am ready to talk with you!`);
    } catch (err) {
      console.warn('Microphone permission request error:', err);
      voiceEnhancer.unlockAudio();
      setHasAudioAccess(true);
    }
  };

  const handleToggleAgentSession = async () => {
    if (isAgentSessionLive) {
      await elevenLabsAgent.endConversation();
      setIsAgentSessionLive(false);
      setIsTeacherSpeaking(false);
      setIsVoiceChatActive(false);
      stopTeacherVoice();
    } else {
      voiceEnhancer.unlockAudio();
      setHasAudioAccess(true);
      setIsAgentSessionLive(true);
      setIsVoiceChatActive(true);

      const teacherName = selectedSubject?.teacherName || 'your faculty';
      const subjectName = selectedSubject?.name || 'course';
      const greeting = `Namaste! I am ${teacherName}, your dedicated faculty for ${subjectName}. Voice conversation is active. Please ask me any doubt in ${selectedSection}!`;

      speakTeacherText(greeting, () => {
        handleStartListening();
      });
    }
  };

  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch subjects from backend API or use instant fallback
  useEffect(() => {
    let initialList = fallbackSubjects;
    const cached = localStorage.getItem('niat_custom_subjects');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const hasFreshVideos = Array.isArray(parsed) && parsed.some((s) => s.youtubeVideos && s.youtubeVideos.some((v) => v.searchQuery));
        if (Array.isArray(parsed) && parsed.length >= 6 && parsed.some((s) => s.id === 'webdev') && hasFreshVideos) {
          initialList = parsed;
        } else {
          localStorage.removeItem('niat_custom_subjects');
        }
      } catch (e) { }
    }

    setSubjects(initialList);
    const prog = initialList.find(s => s.id === 'programming') || initialList[0];
    setSelectedSubject(prog);
    handleSelectTopicSection(prog.sections[0] || 'Python', prog);
    if (prog.youtubeVideos && prog.youtubeVideos.length > 0) {
      setActiveYouTubeVideo(prog.youtubeVideos[0]);
    }
    populateAdminForm(prog);

    fetch(`${API_BASE_URL}/api/subjects`)
      .then(res => res.json())
      .then(data => {
        if (data && data.subjects && data.subjects.length > 0) {
          setSubjects(data.subjects);
          localStorage.setItem('niat_custom_subjects', JSON.stringify(data.subjects));
          const p = data.subjects.find((s) => s.id === 'programming') || data.subjects[0];
          setSelectedSubject(p);
          handleSelectTopicSection(p.sections[0] || 'Python', p);
          if (p.youtubeVideos && p.youtubeVideos.length > 0) {
            setActiveYouTubeVideo(p.youtubeVideos[0]);
          }
          populateAdminForm(p);
        }
      })
      .catch(() => {
        // Fallback remains active seamlessly
      });
  }, []);

  // Update initial welcome message when entering chat
  useEffect(() => {
    if (selectedSubject) {
      const welcomeText = selectedSubject.id === 'webdev'
        ? `Namaste! I am Sujan Sir, your Web Development faculty. Ask me any HTML, CSS, JavaScript, React, Node, or frontend/backend architecture doubts, or paste your markup code below!`
        : selectedSubject.id === 'programming'
          ? `Namaste! I am Atifa Mam, your Programming Languages faculty. Ask me any Python, Java, C, C++, DSA, or SQL doubts, or paste your code below!`
          : `Hello! I am ${selectedSubject.teacherName}, your dedicated ${selectedSubject.name} teacher. How can I help you excel in ${selectedSection} today?`;

      setMessages([
        {
          id: 'welcome-1',
          sender: 'teacher',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          audioUrl: selectedSubject.voiceConfig?.audioSampleUrl
        }
      ]);
    }
  }, [selectedSubject, selectedSection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingResponse]);

  const handleSendMessage = async (customPrompt) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt : inputText;
    if (!textToSend.trim() && !codeSnippet.trim() && !imagePreview) return;

    // Immediately unlock browser audio on student interaction
    voiceEnhancer.unlockAudio();
    stopTeacherVoice();

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: 'student',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      codeSnippet: codeSnippet || undefined,
      imageUrl: imagePreview || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setCodeSnippet('');
    setShowCodeEditor(false);
    const uploadedImg = imagePreview;
    setImagePreview(null);
    setLoadingResponse(true);

    try {
      // Execute Autonomous AI Agent Engine to resolve doubt with deep reasoning
      const agentPlan = await AIAgentTeacherEngine.clarifyDoubt(
        selectedSubject?.id || 'programming',
        selectedSection,
        userMessage.text,
        userMessage.codeSnippet,
        Boolean(uploadedImg)
      );

      // 1. Try ElevenLabs generation if key configured
      let elevenLabsAudioUrl = null;
      if (elevenLabsApiKey) {
        (window).__ELEVENLABS_KEY__ = elevenLabsApiKey;
        try {
          elevenLabsAudioUrl = await generateElevenLabsSpeech(
            agentPlan.spokenVoiceSummary,
            selectedSubject?.id || 'programming',
            selectedSubject?.voiceConfig?.voiceId
          );
        } catch (err) {
          console.warn('ElevenLabs speech generation error:', err);
        }
      }

      const teacherMessage = {
        id: `teacher-${Date.now()}`,
        sender: 'teacher',
        text: agentPlan.fullExplanationMarkdown,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        audioUrl: elevenLabsAudioUrl || undefined,
        agentPlan
      };

      setMessages(prev => [...prev, teacherMessage]);

      // Speak using ElevenLabs audio or cleared calibrated voice
      if (elevenLabsAudioUrl) {
        playTeacherAudio(elevenLabsAudioUrl, agentPlan.spokenVoiceSummary);
      } else {
        speakTeacherText(agentPlan.spokenVoiceSummary);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoadingResponse(false);
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    handleStartListening();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestVoiceSynthesis = async () => {
    if (!adminVoiceId) {
      setTestTtsStatus('Please enter a Voice ID first.');
      return;
    }
    setTestTtsStatus('Synthesizing speech with ElevenLabs...');
    const url = await generateElevenLabsSpeech(
      `Hello, this is ${adminTeacherName}. I am your dedicated faculty for ${subjects.find(s => s.id === adminSelectedSubject)?.name}.`,
      adminSelectedSubject,
      adminVoiceId
    );
    if (url) {
      setTestTtsStatus('âœ“ Playing ElevenLabs synthesized voice!');
      playTeacherVoice(url);
    } else {
      setTestTtsStatus('Free tier or restricted voice - playing uploaded studio voice sample.');
      playTeacherVoice(adminAudioSampleUrl);
    }
  };

  const handleTestLiveAgent = async () => {
    if (!adminAgentId) {
      setTestTtsStatus('Please enter an ElevenLabs Agent ID first.');
      return;
    }
    setTestTtsStatus(`Connecting to ElevenLabs Live Agent (${adminAgentId})...`);
    await handleToggleAgentSession();
  };

  const handleCloneVoiceAttempt = async () => {
    setCloningStatus('Preparing teacher audio file...');
    try {
      const res = await fetch(adminAudioSampleUrl);
      const blob = await res.blob();
      setCloningStatus('Calling ElevenLabs /v1/voices/add API...');
      const result = await cloneVoiceWithAudio(
        adminTeacherName + ' Voice',
        `Official faculty voice for ${adminTeacherName}`,
        blob,
        adminAudioSampleUrl.split('/').pop() || 'sample.mp3',
        elevenLabsApiKey
      );
      if (result.success && result.voiceId) {
        setAdminVoiceId(result.voiceId);
        setCloningStatus(`âœ“ Voice cloned successfully! Assigned Voice ID: ${result.voiceId}`);
      } else {
        setCloningStatus(`API result: ${result.error}. Follow the quick guide below.`);
        setAdminCloningModal(true);
      }
    } catch (err) {
      setCloningStatus(`Cloning check: ${err.message}. Follow the guide below.`);
      setAdminCloningModal(true);
    }
  };

  const handleAdminSave = async () => {
    try {
      setAdminSaveStatus('Saving faculty voice configuration...');
      const currentConfig = subjects.find(s => s.id === adminSelectedSubject)?.voiceConfig || ({});
      const updatedVoiceConfig = {
        provider: currentConfig.provider || 'elevenlabs',
        voiceName: adminVoiceName,
        voiceId: adminVoiceId,
        agentId: adminAgentId,
        audioSampleUrl: adminAudioSampleUrl,
        status: 'active'
      };

      const updatedSubjects = subjects.map(s => {
        if (s.id === adminSelectedSubject) {
          return {
            ...s,
            teacherName: adminTeacherName,
            teacherRole: adminTeacherRole,
            teacherImage: adminTeacherImage,
            voiceConfig: updatedVoiceConfig
          };
        }
        return s;
      });

      setSubjects(updatedSubjects);
      localStorage.setItem('niat_custom_subjects', JSON.stringify(updatedSubjects));

      if (selectedSubject?.id === adminSelectedSubject) {
        setSelectedSubject(updatedSubjects.find(s => s.id === adminSelectedSubject) || null);
      }

      await fetch(`${API_BASE_URL}/api/admin/update-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: adminSelectedSubject,
          updates: {
            teacherName: adminTeacherName,
            teacherRole: adminTeacherRole,
            teacherImage: adminTeacherImage,
            voiceConfig: updatedVoiceConfig
          }
        })
      });

      setAdminSaveStatus('âœ“ Teacher profile, ElevenLabs Voice ID & Agent ID saved successfully!');
    } catch (e) {
      setAdminSaveStatus('âœ“ Saved to offline browser memory successfully!');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3 flex items-center justify-between">
        <div
          onClick={() => setActiveTab('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="gradient-text font-black">NIAT STUDENTS</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">AI TEACHER</span>
            </h1>
            <p className="text-[11px] text-slate-400">Voice Doubt Clarification Platform</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('landing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'landing' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'dashboard' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'subjects' || activeTab === 'sections' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Syllabus & Subjects
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'chat' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            AI Chatroom
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${activeTab === 'login' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <User className="w-3.5 h-3.5 text-purple-400" />
            {currentStudent ? 'Student Account' : 'Student Login'}
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Admin Portal
          </button>
        </nav>

        {/* User quick status & Start button */}
        <div className="flex items-center gap-3">
          {currentStudent ? (
            <div
              onClick={() => setActiveTab('login')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-purple-500/30 hover:border-purple-400 cursor-pointer transition-all shadow-sm group"
              title="Click to view student account or logout"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white uppercase shadow">
                {currentStudent.name ? currentStudent.name[0] : 'S'}
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                  {currentStudent.name}
                </p>
                <p className="text-[10px] font-mono text-purple-400">{currentStudent.niatId}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('login')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Student Login (OTP)</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Teacher Voice Engine Online</span>
          </div>
          <button
            onClick={() => setActiveTab('chat')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Ask Doubts</span>
          </button>
        </div>
      </header>

      {/* Main Body Switcher */}
      <main className="flex-1 flex flex-col">
        {/* TAB 1: LANDING PAGE */}
        {activeTab === 'landing' && (
          <div className="flex-1 flex flex-col">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-20 px-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))]"></div>

              <div className="max-w-5xl mx-auto text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium mb-6 animate-pulse">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Exclusively Designed for NIAT College Students</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight sm:leading-none mb-6">
                  Your Personal <span className="gradient-text">AI Teachers</span> <br className="hidden sm:inline" />
                  Are Here!
                </h1>

                <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
                  Ask doubts. Talk to teachers. Learn without limits. Get step-by-step guidance in your teacher's actual voice, with screenshot error analysis and code debugging.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
                  <button
                    onClick={() => setActiveTab('subjects')}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2 text-sm cursor-pointer group"
                  >
                    <span>Start Learning</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('login')}
                    className="px-6 py-3.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 font-semibold border border-purple-500/40 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-lg shadow-purple-900/20"
                  >
                    <IdCard className="w-4 h-4 text-purple-400" />
                    <span>{currentStudent ? `Student: ${currentStudent.niatId}` : 'Student Login (Phone OTP)'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const math = subjects.find(s => s.id === 'mathematics') || subjects[2];
                      if (math) {
                        setSelectedSubject(math);
                        setSelectedSection(math.sections[0] || 'Algebra');
                        setActiveTab('chat');
                      }
                    }}
                    className="px-6 py-3.5 rounded-xl glass-card hover:bg-slate-800/80 text-slate-200 font-medium border border-slate-700/80 transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    <span>Talk to Narendra Sir (Maths Voice)</span>
                  </button>

                  <button
                    onClick={() => {
                      const prog = subjects.find(s => s.id === 'programming') || subjects[0];
                      if (prog) {
                        setSelectedSubject(prog);
                        setSelectedSection('Python');
                        setActiveTab('chat');
                      }
                    }}
                    className="px-6 py-3.5 rounded-xl glass-card hover:bg-slate-800/80 text-slate-200 font-medium border border-slate-700/80 transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>Talk to Atifa Mam (Python Voice)</span>
                  </button>
                </div>

                {/* Featured Teacher Highlight Banner - 6 Core Faculties */}
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Sujan Sir Card */}
                  <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 text-left relative overflow-hidden flex flex-col justify-between hover:border-blue-500/60 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
                        alt="Sujan Sir"
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white">Sujan Sir</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
                            Web Dev
                          </span>
                        </div>
                        <p className="text-xs text-blue-300 font-medium">Lead Web Architecture</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      "Master HTML, CSS, JavaScript, React, Node, Web Security & Full-Stack architecture."
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => playTeacherVoice('/uploads/audio/sujan_sir_cleared_voice.mp3')}
                        className="py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/30"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Voice</span>
                      </button>
                      <button
                        onClick={() => {
                          const w = subjects.find(s => s.id === 'webdev') || subjects[0];
                          if (w) { setSelectedSubject(w); handleSelectTopicSection(w.sections[0], w); setActiveTab('chat'); }
                        }}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Atifa Mam Card */}
                  <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 text-left relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/60 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400"
                        alt="Atifa Mam"
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white">Atifa Mam</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                            Programming
                          </span>
                        </div>
                        <p className="text-xs text-emerald-300 font-medium">Python & Software Systems</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      "Learn Python, Java, C, C++, Data Structures, Algorithms & OOPs line-by-line."
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => playTeacherVoice('/uploads/audio/atifa_mam_python_voice.mp4')}
                        className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Voice</span>
                      </button>
                      <button
                        onClick={() => {
                          const p = subjects.find(s => s.id === 'programming') || subjects[1];
                          if (p) { setSelectedSubject(p); handleSelectTopicSection(p.sections[0], p); setActiveTab('chat'); }
                        }}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Kavya Mam Card */}
                  <div className="glass-panel p-5 rounded-2xl border border-violet-500/30 text-left relative overflow-hidden flex flex-col justify-between hover:border-violet-500/60 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&q=80&w=400"
                        alt="Kavya Mam"
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-violet-500 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white">Kavya Mam</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium border border-violet-500/30">
                            Gen AI
                          </span>
                        </div>
                        <p className="text-xs text-violet-300 font-medium">AI & Autonomous Agents Lead</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      "Explore LLMs, Prompt Engineering, RAG Pipelines, Vector DBs, LangChain & n8n."
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => playTeacherVoice('/uploads/audio/kavya_mam_cleared_voice.mp3')}
                        className="py-2 px-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-violet-600/30"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Voice</span>
                      </button>
                      <button
                        onClick={() => {
                          const g = subjects.find(s => s.id === 'genai');
                          if (g) { setSelectedSubject(g); handleSelectTopicSection(g.sections[0], g); setActiveTab('chat'); }
                        }}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Kusuma Mam Card */}
                  <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 text-left relative overflow-hidden flex flex-col justify-between hover:border-amber-500/60 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400"
                        alt="Kusuma Mam"
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-500 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white">Kusuma Mam</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
                            Aptitude
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 font-medium">Quantitative & Reasoning Lead</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      "Crush placement aptitude: Speed Math, Percentages, Profit & Loss, Time & Work."
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => playTeacherVoice('/uploads/audio/teacher_agent_voice.mp3')}
                        className="py-2 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/30"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Voice</span>
                      </button>
                      <button
                        onClick={() => {
                          const a = subjects.find(s => s.id === 'aptitude');
                          if (a) { setSelectedSubject(a); handleSelectTopicSection(a.sections[0], a); setActiveTab('chat'); }
                        }}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Narendra Sir Card */}
                  <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 text-left relative overflow-hidden flex flex-col justify-between hover:border-purple-500/60 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400"
                        alt="Narendra Sir"
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-purple-500 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white">Narendra Sir</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium border border-purple-500/30">
                            Maths CSE
                          </span>
                        </div>
                        <p className="text-xs text-purple-300 font-medium">Senior Discrete & Applied Mathematics</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      "Binary operations, discrete math, graph theory, calculus proofs & linear algebra."
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => playTeacherVoice('/uploads/audio/narender_sir_maths_voice.m4a')}
                        className="py-2 px-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-600/30"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Voice</span>
                      </button>
                      <button
                        onClick={() => {
                          const m = subjects.find(s => s.id === 'mathematics');
                          if (m) { setSelectedSubject(m); handleSelectTopicSection(m.sections[0], m); setActiveTab('chat'); }
                        }}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Ankhi Mam Card */}
                  <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 text-left relative overflow-hidden flex flex-col justify-between hover:border-rose-500/60 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"
                        alt="Ankhi Mam"
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-rose-500 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white">Ankhi Mam</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30">
                            English
                          </span>
                        </div>
                        <p className="text-xs text-rose-300 font-medium">Business & Verbal Communications</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      "Speak fluently with professional confidence, eliminate hesitation & ace HR interviews."
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => playTeacherVoice('/uploads/audio/teacher_agent_voice.mp3')}
                        className="py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-600/30"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Voice</span>
                      </button>
                      <button
                        onClick={() => {
                          const e = subjects.find(s => s.id === 'english');
                          if (e) { setSelectedSubject(e); handleSelectTopicSection(e.sections[0], e); setActiveTab('chat'); }
                        }}
                        className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Subject Overview Grid */}
            <section className="max-w-6xl mx-auto px-6 py-12 w-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white">6 Core Subject Faculties</h2>
                  <p className="text-xs text-slate-400">Trained on college curricula with individual authorized voice models</p>
                </div>
                <button
                  onClick={() => setActiveTab('subjects')}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>View all sections</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {subjects.map(subject => (
                  <div
                    key={subject.id}
                    onClick={() => {
                      setSelectedSubject(subject);
                      handleSelectTopicSection(subject.sections[0], subject);
                      setActiveTab('sections');
                    }}
                    className="glass-card p-5 rounded-2xl hover:border-purple-500/50 transition-all cursor-pointer hover:-translate-y-1 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <img
                          src={subject.teacherImage}
                          alt={subject.teacherName}
                          className="w-14 h-14 rounded-xl object-cover ring-2 ring-purple-500/40 group-hover:ring-purple-400"
                        />
                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">{subject.name}</h3>
                          <p className="text-xs font-medium text-slate-400">{subject.teacherName}</p>
                          <span className="text-[10px] text-purple-400 font-semibold">{subject.sections.length} Sections</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                        {subject.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        {subject.voiceConfig.voiceName}
                      </span>
                      <span className="text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 font-medium">
                        Explore <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB: STUDENT LOGIN & OTP AUTHENTICATION */}
        {activeTab === 'login' && (
          <StudentLogin
            apiBaseUrl={API_BASE_URL}
            currentStudent={currentStudent}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            onNavigateHome={() => setActiveTab('subjects')}
          />
        )}

        {/* TAB 2: STUDENT DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Student Learning Hub</h2>
                  <p className="text-xs text-slate-400">
                    {currentStudent
                      ? `Welcome back, ${currentStudent.name} (${currentStudent.niatId}). Continue clarifying doubts with your faculty.`
                      : 'Welcome back, NIAT Scholar. Continue clarifying doubts with your faculty.'}
                  </p>
                </div>
                <div
                  onClick={() => setActiveTab('login')}
                  className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500 transition-all shadow"
                  title="Click to view student profile or logout"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow">
                    {currentStudent?.name ? currentStudent.name[0] : 'NS'}
                  </div>
                  {currentStudent && (
                    <div className="hidden sm:block text-left pr-2">
                      <p className="text-xs font-bold text-white leading-none">{currentStudent.name}</p>
                      <p className="text-[10px] font-mono text-purple-400 leading-none mt-1">{currentStudent.niatId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="glass-card p-4 rounded-xl">
                <span className="text-xs text-slate-400">Doubts Clarified</span>
                <p className="text-2xl font-bold text-white mt-1">28</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <span className="text-xs text-slate-400">Voice Minutes Listened</span>
                <p className="text-2xl font-bold text-purple-400 mt-1">45 mins</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <span className="text-xs text-slate-400">Active Teachers</span>
                <p className="text-2xl font-bold text-indigo-400 mt-1">5 Faculties</p>
              </div>
              <div className="glass-card p-4 rounded-xl">
                <span className="text-xs text-slate-400">Learning Streak</span>
                <p className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1">
                  7 Days <Flame className="w-5 h-5 text-amber-400" />
                </p>
              </div>
            </div>

            {/* Quick Access to Teachers */}
            <h3 className="text-lg font-bold text-white mb-4">Jump In With An AI Teacher</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  className="glass-card p-4 rounded-xl flex items-center justify-between hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img src={subject.teacherImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{subject.name}</h4>
                      <p className="text-xs text-slate-400">{subject.teacherName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSubject(subject);
                      handleSelectTopicSection(subject.sections[0], subject);
                      setActiveTab('chat');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Talk Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SUBJECT SELECTION */}
        {activeTab === 'subjects' && (
          <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Choose Your Subject</h2>
              <p className="text-xs text-slate-400">Select any subject to view all topic sections and interact with your professor.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/50 transition-all group"
                >
                  <div>
                    <div className="relative mb-4">
                      <img
                        src={subject.teacherImage}
                        alt={subject.teacherName}
                        className="w-full h-44 rounded-xl object-cover"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-[11px] font-semibold text-purple-300 border border-slate-700/80">
                        {subject.sections.length} Sections
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors mb-1">{subject.name}</h3>
                    <p className="text-xs text-indigo-400 font-semibold mb-2">{subject.teacherName}</p>
                    <p className="text-xs text-slate-300 leading-relaxed mb-6">{subject.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedSubject(subject);
                        setActiveTab('sections');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all cursor-pointer text-center"
                    >
                      Explore Sections
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSubject(subject);
                        handleSelectTopicSection(subject.sections[0], subject);
                        setActiveTab('chat');
                      }}
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                      title="Direct Chat"
                    >
                      <Mic className="w-4 h-4 text-purple-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SYLLABUS & TOPIC VIDEO SELECTION */}
        {activeTab === 'sections' && selectedSubject && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
            <div className="flex items-center justify-between gap-4 mb-6">
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to All Subjects
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/60">
                  {selectedSubject.sections.length} Syllabus Modules
                </span>
                {selectedSubject.youtubeVideos && selectedSubject.youtubeVideos.length > 0 && (
                  <button
                    onClick={() => {
                      if (!activeYouTubeVideo && selectedSubject.youtubeVideos && selectedSubject.youtubeVideos.length > 0) {
                        setActiveYouTubeVideo(selectedSubject.youtubeVideos[0]);
                      }
                      setIsYouTubeHUDOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-full bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-rose-950/30"
                  >
                    <Youtube className="w-4 h-4 text-rose-400" />
                    <span>Open YouTube Lecture HUD</span>
                  </button>
                )}
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedSubject.name + ' full course playlist tutorial')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
                  title="Shift this course into YouTube Search"
                >
                  <Search className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Search All on YouTube â†—</span>
                </a>
              </div>
            </div>

            {/* Quick Switcher across all 6 faculties */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">Switch Faculty:</span>
              {subjects.map(s => {
                const isActive = s.id === selectedSubject.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSubject(s);
                      handleSelectTopicSection(s.sections[0], s);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400/60 shadow-md shadow-purple-500/20'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                  >
                    <img src={s.teacherImage} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-white/30" />
                    <span>{s.name} ({s.teacherName})</span>
                  </button>
                );
              })}
            </div>

            {/* Subject Hero Card with Faculty Credentials */}
            <div className="glass-panel p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-6 border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
              <img
                src={selectedSubject.teacherImage}
                alt={selectedSubject.teacherName}
                className="w-24 h-24 rounded-2xl object-cover ring-2 ring-purple-500 shadow-xl shadow-purple-950/40"
              />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
                    {selectedSubject.name} Department
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                    Authorized Voice Ready
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedSubject.teacherName}</h2>
                <p className="text-xs text-indigo-300 font-medium mb-2">{selectedSubject.teacherRole}</p>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{selectedSubject.description}</p>
              </div>
              <div className="flex flex-col gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => playTeacherVoice()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20 transition-all"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Listen to Teacher Voice</span>
                </button>
                <button
                  onClick={() => {
                    handleSelectTopicSection(selectedSubject.sections[0], selectedSubject);
                    setActiveTab('chat');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Enter AI Chatroom</span>
                </button>
              </div>
            </div>

            {/* Syllabus Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Course Syllabus & Topic Video Lectures</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
                    {selectedSubject.sections.length} Topics
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Click any topic to play its video lecture or ask doubts directly with {selectedSubject.teacherName}.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={syllabusSearch}
                  onChange={(e) => setSyllabusSearch(e.target.value)}
                  placeholder={`Search in ${selectedSubject.name}...`}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                {syllabusSearch && (
                  <button
                    onClick={() => setSyllabusSearch('')}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                  >
                    Ã—
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Syllabus Topics with Embedded YouTube Video Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSubject.sections
                .filter(sec => !syllabusSearch || sec.toLowerCase().includes(syllabusSearch.toLowerCase()))
                .map((sec, idx) => {
                  const matchedVideo = selectedSubject.youtubeVideos?.find(v => {
                    const topNorm = v.topic.toLowerCase().trim();
                    const secNorm = sec.toLowerCase().trim();
                    return topNorm === secNorm || topNorm.includes(secNorm) || secNorm.includes(topNorm);
                  });

                  return (
                    <div
                      key={idx}
                      className="glass-card p-4 rounded-2xl hover:border-purple-500/60 transition-all group flex flex-col justify-between border border-slate-800/80 bg-slate-950/50 hover:bg-slate-900/50"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50 font-bold">
                            Module #{String(idx + 1).padStart(2, '0')}
                          </span>
                          {matchedVideo && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/50 flex items-center gap-1">
                              <Youtube className="w-3 h-3 text-rose-400" />
                              {matchedVideo.duration}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors mb-1.5 leading-snug">
                          {sec}
                        </h4>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                          {matchedVideo ? matchedVideo.summary : `Master ${sec} with ${selectedSubject.teacherName}. Review line-by-line concept breakdown and practice test questions.`}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
                        {/* Direct YouTube Access & Search row */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {matchedVideo ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSection(sec);
                                setActiveYouTubeVideo(matchedVideo);
                                setIsYouTubeHUDOpen(true);
                              }}
                              className="py-1.5 px-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                            >
                              <Play className="w-3 h-3" />
                              <span>Play in HUD</span>
                            </button>
                          ) : (
                            <div className="py-1.5 px-2 rounded-xl bg-slate-900 text-slate-500 text-[11px] text-center font-medium">
                              Lecture Ready
                            </div>
                          )}

                          <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(matchedVideo?.searchQuery || sec + ' ' + selectedSubject.name + ' full tutorial best')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="py-1.5 px-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow"
                            title="Shift this topic to YouTube Search to find best videos"
                          >
                            <Search className="w-3 h-3 text-rose-400" />
                            <span>YouTube Search â†—</span>
                          </a>
                        </div>

                        {/* Ask Doubt Row */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSection(sec);
                            if (matchedVideo) {
                              setActiveYouTubeVideo(matchedVideo);
                            }
                            setActiveTab('chat');
                          }}
                          className="w-full py-1.5 px-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Ask {selectedSubject.teacherName} (AI Chat)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 5: AI TEACHER CHATROOM */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 space-y-4">
            {/* Interactive Maya-Style Autonomous Teacher Avatar */}
            <MayaInteractiveAvatar
              isSpeaking={isTeacherSpeaking}
              isListening={isRecording}
              isAgentLive={isAgentSessionLive}
              teacherName={selectedSubject?.teacherName || 'Sujan Sir'}
              teacherImage={selectedSubject?.teacherImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"}
              subjectName={selectedSubject?.name || 'Web Development'}
              statusText={
                isAgentSessionLive
                  ? "ElevenLabs Live Conversational Voice Agent Connected! Speak naturally with your teacher."
                  : isTeacherSpeaking
                    ? `${selectedSubject?.teacherName} is explaining in cleared, authorized voice...`
                    : isRecording
                      ? "I am listening to your doubt... Speak now!"
                      : `Ask any doubt in ${selectedSection}. You can speak or type below.`
              }
              onToggleMic={handleMicToggle}
              onStopVoice={stopTeacherVoice}
              onPreviewVoice={() => playTeacherVoice(selectedSubject?.voiceConfig?.audioSampleUrl || '/uploads/audio/sujan_sir_cleared_voice.mp3')}
              onPreviewSecondaryVoice={selectedSubject?.voiceConfig?.secondaryAudioUrl ? () => playTeacherVoice(selectedSubject.voiceConfig.secondaryAudioUrl) : undefined}
              secondaryVoiceLabel={undefined}
              onStartAgentVoice={handleToggleAgentSession}
              onOpenYouTubeHUD={() => {
                if (selectedSubject?.youtubeVideos && selectedSubject.youtubeVideos.length > 0) {
                  if (!activeYouTubeVideo) {
                    setActiveYouTubeVideo(selectedSubject.youtubeVideos[0]);
                  }
                  setIsYouTubeHUDOpen(true);
                }
              }}
              hasYouTubeVideo={Boolean(selectedSubject?.youtubeVideos && selectedSubject.youtubeVideos.length > 0)}
              activeTopic={selectedSection}
              activeVideoTitle={activeYouTubeVideo?.title}
              onRequestAccess={handleRequestAccess}
              hasAccess={hasAudioAccess}
            />

            {/* Chatroom Header with Section Switching */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={selectedSubject?.teacherImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"}
                    alt="Teacher"
                    className="w-13 h-13 rounded-xl object-cover ring-2 ring-purple-500 shadow-md"
                  />
                  {isTeacherSpeaking && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedSubject?.teacherName || 'Sujan Sir'}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                      Online Faculty
                    </span>
                  </div>
                  <p className="text-xs text-indigo-400 font-medium">
                    {selectedSubject?.name} â€¢ Topic: <span className="text-purple-300 font-semibold">{selectedSection}</span>
                  </p>
                </div>
              </div>

              {/* Teacher Voice Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isTeacherSpeaking ? (
                  <button
                    onClick={stopTeacherVoice}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Stop Speaking</span>
                  </button>
                ) : (
                  <button
                    onClick={() => playTeacherVoice()}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Play Teacher Voice</span>
                  </button>
                )}

                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedSection + ' ' + (selectedSubject?.name || '') + ' best tutorial')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                  title="Shift this active doubt topic to YouTube Search"
                >
                  <Youtube className="w-3.5 h-3.5 text-rose-400" />
                  <span>Search on YouTube â†—</span>
                </a>

                {/* Section switch dropdown */}
                <select
                  value={selectedSection}
                  onChange={(e) => handleSelectTopicSection(e.target.value)}
                  className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {selectedSubject?.sections.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>

                <button
                  onClick={() => setMessages([])}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Clear Chat History"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Speaking Waveform Indicator */}
            {isTeacherSpeaking && (
              <div className="mb-3 px-4 py-2 rounded-xl bg-purple-900/30 border border-purple-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-400 animate-bounce" />
                  <span className="text-xs text-purple-300 font-medium">
                    {selectedSubject?.teacherName} is speaking authorized audio...
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 bg-purple-400 rounded-full wave-bar"></span>
                  <span className="w-1 bg-indigo-400 rounded-full wave-bar"></span>
                  <span className="w-1 bg-purple-300 rounded-full wave-bar"></span>
                  <span className="w-1 bg-indigo-300 rounded-full wave-bar"></span>
                  <span className="w-1 bg-purple-500 rounded-full wave-bar"></span>
                </div>
              </div>
            )}

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[380px] max-h-[500px]">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'teacher' && (
                    <img
                      src={selectedSubject?.teacherImage || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover ring-1 ring-purple-500/50 mt-1 flex-shrink-0"
                    />
                  )}

                  <div className={`max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${msg.sender === 'student'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                    : 'glass-panel border border-slate-700/80 text-slate-100 rounded-tl-none'
                    }`}>
                    <div className="flex items-center justify-between gap-4 mb-1 text-[11px] opacity-75">
                      <span className="font-semibold">{msg.sender === 'student' ? 'You (Student)' : selectedSubject?.teacherName}</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* Screenshot image display */}
                    {msg.imageUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-slate-600/50">
                        <img src={msg.imageUrl} alt="Uploaded error" className="max-h-60 w-auto object-contain bg-black/40" />
                      </div>
                    )}

                    {/* Code block display */}
                    {msg.codeSnippet && (
                      <div className="my-2 p-3 rounded-xl bg-slate-950 font-mono text-xs border border-slate-800 text-emerald-400 overflow-x-auto whitespace-pre">
                        {msg.codeSnippet}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {msg.agentPlan?.followUpQuestion && (
                      <div className="mt-2.5 p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2">
                        <span className="text-amber-400 font-bold">ðŸŽ¯</span>
                        <span>{msg.agentPlan.followUpQuestion}</span>
                      </div>
                    )}

                    {msg.agentPlan?.followUpSuggestions && msg.agentPlan.followUpSuggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.agentPlan.followUpSuggestions.map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(suggestion)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer text-left"
                          >
                            ðŸ’¬ {suggestion}
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.sender === 'teacher' && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            voiceEnhancer.unlockAudio();
                            if (msg.audioUrl) {
                              playTeacherAudio(msg.audioUrl, msg.agentPlan?.spokenVoiceSummary);
                            } else if (msg.agentPlan?.spokenVoiceSummary) {
                              speakTeacherText(msg.agentPlan.spokenVoiceSummary);
                            } else {
                              speakTeacherText(msg.text);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-xs text-white font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-600/20 active:scale-95"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
                          <span>ðŸ”Š Listen to {selectedSubject?.teacherName || 'Faculty'}'s Voice</span>
                        </button>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          {msg.audioUrl ? 'ElevenLabs Cloned Voice' : 'AI Voice Agent Active'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loadingResponse && (
                <div className="flex gap-3 justify-start">
                  <div className="glass-panel p-4 rounded-2xl border border-slate-700 flex items-center gap-2 text-xs text-purple-300">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                    <span>{selectedSubject?.teacherName} is formulating the step-by-step explanation...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Code editor accordion */}
            {showCodeEditor && (
              <div className="mt-3 glass-panel p-3 rounded-xl border border-indigo-500/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Paste Code / Markup for Line-by-Line Review
                  </span>
                  <button
                    onClick={() => setShowCodeEditor(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Close Editor
                  </button>
                </div>
                <textarea
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Paste your HTML, JavaScript, Python, or SQL snippet here..."
                  className="w-full h-24 p-2.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Image Preview bar */}
            {imagePreview && (
              <div className="mt-2 glass-panel p-2 rounded-xl flex items-center justify-between border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <img src={imagePreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                  <span className="text-xs text-slate-300">Screenshot attached for error analysis</span>
                </div>
                <button
                  onClick={() => setImagePreview(null)}
                  className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Input & Voice Toolbar */}
            <div className="mt-3 glass-panel p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2">
              {/* Mic Speech Button */}
              <button
                onClick={handleMicToggle}
                className={`p-3 rounded-xl transition-all cursor-pointer ${isRecording
                  ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300'
                  }`}
                title={isRecording ? 'Listening... click to stop' : 'Ask question by speaking'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Upload image button */}
              <label className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors" title="Upload screenshot / question photo">
                <Upload className="w-4 h-4" />
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>

              {/* Code snippet button */}
              <button
                onClick={() => setShowCodeEditor(!showCodeEditor)}
                className={`p-3 rounded-xl transition-colors cursor-pointer ${showCodeEditor ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                title="Paste code snippet"
              >
                <Code className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isRecording ? "Listening to your voice..." : `Ask ${selectedSubject?.teacherName || 'teacher'} any doubt in ${selectedSection}...`}
                className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={loadingResponse || (!inputText.trim() && !codeSnippet.trim() && !imagePreview)}
                className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md shadow-purple-600/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN PORTAL */}
        {activeTab === 'admin' && (
          <div className="max-w-5xl mx-auto px-6 py-8 w-full flex-1">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-indigo-400" />
                  Admin Teacher & Voice Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Assign individual authorized teacher voice profiles, customize faculty pictures, and manage subject sections.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Protected Admin Console
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Subject selector sidebar */}
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Faculties</h3>
                {subjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => populateAdminForm(s)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${adminSelectedSubject === s.id ? 'bg-indigo-600 text-white shadow-md' : 'glass-card hover:bg-slate-800 text-slate-300'
                      }`}
                  >
                    <img src={s.teacherImage} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <div>{s.name}</div>
                      <div className="text-[10px] opacity-75 font-normal">{s.teacherName}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Editor panel */}
              <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
                  <img src={adminTeacherImage} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500" />
                  <div>
                    <h4 className="text-base font-bold text-white">{adminTeacherName}</h4>
                    <p className="text-xs text-indigo-400">{adminTeacherRole}</p>
                    <span className="text-[10px] text-slate-400">Subject: {subjects.find(s => s.id === adminSelectedSubject)?.name}</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Teacher Full Name</label>
                    <input
                      type="text"
                      value={adminTeacherName}
                      onChange={(e) => setAdminTeacherName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Teacher Role / Designation</label>
                    <input
                      type="text"
                      value={adminTeacherRole}
                      onChange={(e) => setAdminTeacherRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Teacher Profile Picture URL</label>
                    <input
                      type="text"
                      value={adminTeacherImage}
                      onChange={(e) => setAdminTeacherImage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Voice & Agent Configuration */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <span className="font-bold text-white flex items-center gap-2 text-sm">
                          <Volume2 className="w-4 h-4 text-indigo-400" />
                          ElevenLabs Voice Cloning & Real-time Agent Hub
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Configure individual voice cloning, agent IDs, and high-fidelity audio samples for each teacher.
                        </p>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        {elevenLabsApiKey ? 'ELEVENLABS CONNECTED' : 'STUDIO DSP AUDIO READY'}
                      </span>
                    </div>

                    {/* API Key */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 text-[11px] font-medium">ElevenLabs API Key</label>
                        <a
                          href="https://elevenlabs.io/app/settings/api-keys"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          Get API Key <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <input
                        type="password"
                        placeholder="sk_... (ElevenLabs API Key)"
                        value={elevenLabsApiKey}
                        onChange={(e) => {
                          setElevenLabsApiKey(e.target.value);
                          localStorage.setItem('niat_elevenlabs_key', e.target.value);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Conversational Voice Agent ID */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            Conversational Agent ID
                          </label>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                            Live Voice
                          </span>
                        </div>
                        <input
                          type="text"
                          value={adminAgentId}
                          onChange={(e) => setAdminAgentId(e.target.value)}
                          placeholder="agent_... or cjVigY..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => setAdminAgentId('agent_2001m787qgn3fbnag9rvn4rvb72x')}
                            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
                          >
                            Default Agent
                          </button>
                          <button
                            type="button"
                            onClick={handleTestLiveAgent}
                            className="px-2.5 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-200" />
                            Test Agent Session
                          </button>
                        </div>
                      </div>

                      {/* TTS Voice ID */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                            TTS / Cloned Voice ID
                          </label>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                            Voice Clone
                          </span>
                        </div>
                        <input
                          type="text"
                          value={adminVoiceId}
                          onChange={(e) => setAdminVoiceId(e.target.value)}
                          placeholder="Voice ID (e.g. a1TnjruAs5jTzdrjL8Vd)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="text-slate-500 font-semibold">Presets:</span>
                            <button type="button" onClick={() => setAdminVoiceId('CwhRBWXzGAHq8TQ4Fs17')} className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">Sujan (WebDev)</button>
                            <button type="button" onClick={() => setAdminVoiceId('hpp4J3VqNfWAUOO0d1Us')} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">Atifa (Programming)</button>
                            <button type="button" onClick={() => setAdminVoiceId('XrExE9yKIg1WjnnlVkGX')} className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30">Kavya (Gen AI)</button>
                            <button type="button" onClick={() => setAdminVoiceId('EXAVITQu4vr4xnSDxMaL')} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30">Kusuma (Aptitude)</button>
                            <button type="button" onClick={() => setAdminVoiceId('IKne3meq5aSn9XLyUdCD')} className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30">Narendra (Maths CSE)</button>
                            <button type="button" onClick={() => setAdminVoiceId('a1TnjruAs5jTzdrjL8Vd')} className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30">Ankhi (English)</button>
                          </div>
                          <button
                            type="button"
                            onClick={handleTestVoiceSynthesis}
                            className="px-2.5 py-1 rounded bg-purple-600/80 hover:bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer self-end sm:self-auto"
                          >
                            <Play className="w-3 h-3 text-purple-200" />
                            Test TTS
                          </button>
                        </div>
                      </div>
                    </div>

                    {testTtsStatus && (
                      <div className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-medium">
                        {testTtsStatus}
                      </div>
                    )}

                    {/* Master Audio Source File & Download / Clone Actions */}
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Authorized Master Audio Recording
                        </label>
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          Studio Verified
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={adminAudioSampleUrl}
                          onChange={(e) => setAdminAudioSampleUrl(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => playTeacherVoice(adminAudioSampleUrl)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" /> Play Voice
                        </button>
                        <a
                          href={adminAudioSampleUrl}
                          download={adminAudioSampleUrl.split('/').pop()}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-400" /> Download Audio
                        </a>
                      </div>

                      {/* Clone action button */}
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400">
                          Use this recording to clone the voice in ElevenLabs or via API:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCloneVoiceAttempt}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-200" />
                            Clone Voice via ElevenLabs
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminCloningModal(true)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                          >
                            View Guide
                          </button>
                        </div>
                      </div>

                      {cloningStatus && (
                        <div className="text-[11px] p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-medium">
                          {cloningStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* B.Tech LLM Model Connection Card */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        B.Tech LLM Reasoning Engine (Dynamic Question Answers)
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        CONNECTED & ACTIVE
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Connected to real-time LLM models with verified B.Tech Engineering Professor personas (Sujan Sir, Atifa Mam, Narendra Sir, Kavya Mam, Kusuma Mam, Ankhi Mam). Every student doubt receives a unique, step-by-step engineering solution!
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-slate-400 text-[11px] font-medium block mb-1">LLM Provider</label>
                        <select
                          value={llmProvider}
                          onChange={(e) => {
                            setLlmProvider(e.target.value);
                            localStorage.setItem('niat_llm_provider', e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none"
                        >
                          <option value="pollinations">Multi-Model (Pollinations GPT-4o-mini - Free & Zero Setup)</option>
                          <option value="gemini">Google Gemini 1.5 Flash (Ultra Fast)</option>
                          <option value="groq">Groq (Llama-3.3 70B - High Speed)</option>
                          <option value="openai">OpenAI (GPT-4o-mini)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 text-[11px] font-medium block mb-1">API Key (Optional for Custom Providers)</label>
                        <input
                          type="password"
                          placeholder="AIza... or gsk_... or sk-... (Optional)"
                          value={llmApiKey}
                          onChange={(e) => {
                            setLlmApiKey(e.target.value);
                            localStorage.setItem('niat_llm_key', e.target.value);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>{adminSaveStatus && (
                  <p className="text-xs text-emerald-400 font-medium">{adminSaveStatus}</p>
                )}

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={handleAdminSave}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    Save Teacher & Voice Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* JARVIS Holographic YouTube HUD Theatre */}
        <YouTubeHUDPlayer
          video={activeYouTubeVideo}
          subjectVideos={selectedSubject?.youtubeVideos || []}
          isOpen={isYouTubeHUDOpen}
          onClose={() => setIsYouTubeHUDOpen(false)}
          onSelectVideo={(v) => setActiveYouTubeVideo(v)}
          teacherName={selectedSubject?.teacherName || 'Faculty'}
        />
      </main>

      {/* ElevenLabs Voice Cloning & Agent Setup Guide Modal */}
      {adminCloningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/40 shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Clone Teacher Voice & Set Up Live Voice Agent
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Step-by-step instructions for ElevenLabs Voice Cloning and Agent connection
                </p>
              </div>
              <button
                onClick={() => setAdminCloningModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                âœ•
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-bold text-indigo-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Download the Teacher's Master Voice File
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Download <code className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded">{adminAudioSampleUrl.split('/').pop()}</code> directly using the "Download Audio" button.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-bold text-purple-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">2</span>
                  Add Cloned Voice in ElevenLabs
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Open <a href="https://elevenlabs.io/app/voices" target="_blank" rel="noreferrer" className="text-purple-400 underline font-semibold">elevenlabs.io/app/voices</a>, click <strong>"Add a new voice"</strong> &rarr; <strong>"Instant Voice Clone"</strong>. Upload the file, name it (e.g. "{adminTeacherName}"), and click Create. Copy the <strong>Voice ID</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-bold text-emerald-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                  Create Conversational Agent for this Teacher
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Open <a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">elevenlabs.io/app/conversational-ai</a>, click <strong>"Create Agent"</strong>, select your cloned voice, set the role to "{adminTeacherName}", and copy the <strong>Agent ID</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-bold text-cyan-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px]">4</span>
                  Paste IDs and Save
                </div>
                <p className="text-slate-400 pl-7 text-[11px]">
                  Paste the Voice ID and Agent ID into the boxes in the Admin panel and click <strong>"Save Teacher & Voice Settings"</strong>. Every doubt clarification and live session will now instantly use your cloned voice!
                </p>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={() => setAdminCloningModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Got It, Let's Clone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="glass-panel border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        NIAT STUDENTS â€“ AI Voice Doubt Clarification Platform Â© 2026. Built exclusively for NIAT student success.
      </footer>
    </div>
  );
}

export default App;






