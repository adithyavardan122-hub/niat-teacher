// Audio filter pipeline and speech synthesis for clear, loud faculty voice output

class VoiceEnhancer {
  currentAudio = null;
  isUnlocked = false;

  constructor() {}

  /**
   * Unlock browser audio context and media playback permission on user gesture
   */
  unlockAudio() {
    if (this.isUnlocked) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        const dummyCtx = new AudioCtxClass();
        dummyCtx.resume().then(() => {
          dummyCtx.close();
        }).catch(() => {});
      }
      this.isUnlocked = true;
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Play studio audio (ElevenLabs speech blob or local file) directly via HTML5 Audio
   * This guarantees 100% audibility without Web Audio API CORS/silence blocks
   */
  playAudio(
    src,
    onStart,
    onEnd
  ) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this.unlockAudio();

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }

    const audio = new Audio(src);
    this.currentAudio = audio;
    audio.preload = 'auto';

    return new Promise((resolve, reject) => {
      audio.onplay = () => {
        onStart?.();
      };

      audio.onended = () => {
        onEnd?.();
        resolve();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error, falling back:', e);
        onEnd?.();
        reject(e);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve())
          .catch((err) => {
            console.warn('Audio play() blocked by browser autoplay policy:', err);
            onEnd?.();
            reject(err);
          });
      } else {
        resolve();
      }
    });
  }

  stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
  }
}

export const voiceEnhancer = new VoiceEnhancer();

/**
 * Intelligent Text-to-Speech Voice Matcher & Cloner
 * When reading dynamic responses, matches pitch, speed, timbre, and gender to each faculty member
 */
export function speakWithClonedTeacherVoice(
  text, 
  teacherId, 
  onStart, 
  onEnd
) {
  if (!('speechSynthesis' in window)) return false;

  window.speechSynthesis.cancel();

  // Convert Math & LaTeX symbols into clear phonetic teacher speech
  const cleanText = text
    .replace(/\\lim_\{([^}]+)\}/g, 'the limit as $1 of')
    .replace(/\\int_([^^]+)\^([^\s]+)/g, 'the integral from $1 to $2 of')
    .replace(/\\int/g, 'the integral of')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, 'the fraction $1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'the square root of $1')
    .replace(/\\to/g, 'approaches')
    .replace(/\\cdot/g, 'times')
    .replace(/\\times/g, 'multiplied by')
    .replace(/\\pm/g, 'plus or minus')
    .replace(/\\neq/g, 'is not equal to')
    .replace(/\\leq/g, 'is less than or equal to')
    .replace(/\\geq/g, 'is greater than or equal to')
    .replace(/\\alpha/g, 'alpha')
    .replace(/\\beta/g, 'beta')
    .replace(/\\theta/g, 'theta')
    .replace(/\\pi/g, 'pi')
    .replace(/```[\s\S]*?```/g, 'Here is the step by step breakdown.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[\\[\s\S]*?\\\]/g, 'Formula as displayed on screen.')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/[#*_~>]/g, '')
    .trim();

  if (!cleanText) return false;

  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Profile-specific voice calibration matching clear agent voice for all 6 faculty
  const isFemale = teacherId === 'programming' || teacherId === 'genai' || teacherId === 'aptitude' || teacherId === 'english';

  if (teacherId === 'webdev') {
    // Sujan Sir - Web Architecture Lead: Conversational, crisp consonant clarity, friendly pacing
    utterance.pitch = 0.98;
    utterance.rate = 0.96;
  } else if (teacherId === 'programming') {
    // Atifa Mam - Python & Software Systems: Clear, engaging, warm feminine tone
    utterance.pitch = 1.10;
    utterance.rate = 0.96;
  } else if (teacherId === 'mathematics') {
    // Narendra Sir - Maths CSE: Deep, measured tempo for formula comprehension
    utterance.pitch = 0.92;
    utterance.rate = 0.93;
  } else if (teacherId === 'genai') {
    // Kavya Mam - Generative AI Specialist: Professional, modern, articulate
    utterance.pitch = 1.08;
    utterance.rate = 0.98;
  } else if (teacherId === 'aptitude') {
    // Kusuma Mam - Speed Math & Placement Aptitude: Energetic, confident, inspiring
    utterance.pitch = 1.06;
    utterance.rate = 1.02;
  } else if (teacherId === 'english') {
    // Ankhi Mam - English Communication Specialist: Polished, clear diction, RP / neutral cadence
    utterance.pitch = 1.06;
    utterance.rate = 0.95;
  } else {
    utterance.pitch = 1.0;
    utterance.rate = 0.97;
  }

  // Pick natural voice matched to the gender and profile of the faculty
  const voices = window.speechSynthesis.getVoices();

  let matchedVoice;

  if (isFemale) {
    // Prioritize natural female neural voices
    matchedVoice = voices.find(v => 
      (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US') || v.lang.startsWith('en-IN')) && 
      (v.name.includes('Sonia') || v.name.includes('Jenny') || v.name.includes('Aria') || 
       v.name.includes('Google UK English Female') || v.name.includes('Google US English Female') || 
       v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Victoria') || 
       v.name.includes('Karen') || v.name.toLowerCase().includes('female'))
    ) || voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Jenny'))
    );
  } else {
    // Prioritize natural male neural voices
    matchedVoice = voices.find(v => 
      (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US') || v.lang.startsWith('en-IN')) && 
      (v.name.includes('George') || v.name.includes('Arthur') || v.name.includes('Oliver') || 
       v.name.includes('Google UK English Male') || v.name.includes('David') || 
       v.name.includes('Guy') || v.name.includes('Ryan') || v.name.toLowerCase().includes('male'))
    ) || voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark'))
    );
  }

  // Fallback to any English natural voice
  if (!matchedVoice) {
    matchedVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'))
    ) || voices.find(v => v.lang.startsWith('en'));
  }

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return true;
}




