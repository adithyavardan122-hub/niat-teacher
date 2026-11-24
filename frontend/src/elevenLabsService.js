// Subject to ElevenLabs high-quality verified premade voices
// Supported by all active API keys without requiring paid library subscriptions
export const ELEVENLABS_VOICES = {
  webdev: { 
    voiceId: 'CwhRBWXzGAHq8TQ4Fs17', // Roger (Sujan Sir - Web Architecture Lead)
    name: 'Sujan Sir (Web Development Lead Voice)',
    fallbackId: 'cjVigY5qzO86Huf0OWal'
  },
  programming: { 
    voiceId: 'hpp4J3VqNfWAUOO0d1Us', // Bella (Atifa Mam - Python & Programming Faculty)
    name: 'Atifa Mam (Programming Languages Voice)',
    fallbackId: 'EXAVITQu4vr4xnSDxMaL'
  },
  mathematics: { 
    voiceId: 'IKne3meq5aSn9XLyUdCD', // Charlie (Narendra Sir - Confident Math)
    name: 'Narendra Sir (Maths CSE Classroom Voice)',
    fallbackId: 'CwhRBWXzGAHq8TQ4Fs17'
  },
  genai: { 
    voiceId: 'XrExE9yKIg1WjnnlVkGX', // Matilda (Kavya Mam - AI Specialist)
    name: 'Kavya Mam (Generative AI Specialist)',
    fallbackId: 'SAz9YHcvj6GT2YYXdXww'
  },
  aptitude: { 
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah (Kusuma Mam - Aptitude Mentor)
    name: 'Kusuma Mam (Aptitude & Speed Math Mentor)',
    fallbackId: 'JBFqnCBsd6RMkjVDRZzb'
  },
  english: { 
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2', // Alice (Ankhi Mam - Clear, Engaging Educator)
    name: 'Ankhi Mam (English Communication Specialist)',
    fallbackId: 'EXAVITQu4vr4xnSDxMaL' // Sarah (Clear English Educator premade)
  }
};

export const ELEVENLABS_DEFAULT_AGENT_ID = 'agent_2001m787qgn3fbnag9rvn4rvb72x';

/**
 * Generate speech from ElevenLabs API with automatic fallback for tier/permission limitations.
 */
export async function generateElevenLabsSpeech(text, subjectId, customVoiceId) {
  const apiKey = window.__ELEVENLABS_KEY__ || 
                 localStorage.getItem('niat_elevenlabs_key') || 
                 import.meta.env.VITE_ELEVENLABS_API_KEY || '';

  if (!apiKey) {
    return null;
  }

  const voiceMeta = ELEVENLABS_VOICES[subjectId] || ELEVENLABS_VOICES.programming;
  const primaryVoiceId = customVoiceId || voiceMeta.voiceId;
  const fallbackVoiceId = voiceMeta.fallbackId || 'CwhRBWXzGAHq8TQ4Fs17';
  const modelId = import.meta.env.VITE_ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

  // Clean Markdown & formulas for natural speech delivery
  const speechText = text
    .replace(/```[\s\S]*?```/g, 'Here is the step by step explanation.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[\\[\s\S]*?\\\]/g, 'As shown in the formula.')
    .replace(/\\lim_\{([^}]+)\}/g, 'limit as $1 of')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\int/g, 'integral')
    .replace(/[#*_~>]/g, '')
    .trim()
    .slice(0, 800);

  const requestTTS = async (vId) => {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: speechText,
          model_id: modelId,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.85,
            style: 0.15,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        console.warn(`ElevenLabs TTS response status for ${vId}:`, response.status);
        return null;
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (err) {
      console.warn(`TTS fetch error for ${vId}:`, err);
      return null;
    }
  };

  // Try primary voice ID first
  let audioUrl = await requestTTS(primaryVoiceId);

  // If primary voice is restricted (e.g. library voice on free tier) and a fallback exists
  if (!audioUrl && fallbackVoiceId && fallbackVoiceId !== primaryVoiceId) {
    console.info(`Attempting verified premade fallback voice: ${fallbackVoiceId}`);
    audioUrl = await requestTTS(fallbackVoiceId);
  }

  return audioUrl;
}

/**
 * Attempt to clone a voice via ElevenLabs API (requires key with voices_write scope)
 */
export async function cloneVoiceWithAudio(name, description, audioBlob, fileName = "sample.mp3", apiKeyOverride) {
  const apiKey = apiKeyOverride || 
                 window.__ELEVENLABS_KEY__ || 
                 localStorage.getItem('niat_elevenlabs_key') || 
                 import.meta.env.VITE_ELEVENLABS_API_KEY || '';

  if (!apiKey) {
    return { success: false, error: 'No ElevenLabs API key provided.' };
  }

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('files', audioBlob, fileName);

    const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey
      },
      body: formData
    });

    const data = await res.json();
    if (res.ok && data.voice_id) {
      return { success: true, voiceId: data.voice_id };
    } else {
      const msg = data?.detail?.message || data?.detail || 'Voice cloning failed';
      return { success: false, error: msg };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Network error cloning voice' };
  }
}

/**
 * Fetch available voices from user's ElevenLabs account
 */
export async function fetchUserVoices(apiKeyOverride) {
  const apiKey = apiKeyOverride || 
                 window.__ELEVENLABS_KEY__ || 
                 localStorage.getItem('niat_elevenlabs_key') || 
                 import.meta.env.VITE_ELEVENLABS_API_KEY || '';

  if (!apiKey) return [];

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    });
    if (res.ok) {
      const data = await res.json();
      return data.voices || [];
    }
  } catch (err) {
    console.warn('Error fetching voices:', err);
  }
  return [];
}




