import { Conversation } from '@elevenlabs/client';

export class ElevenLabsAgentManager {
  conversation = null;
  isConnecting = false;

  async startAgentConversation(agentId, onStatusChange, onMessage, onModeChange) {
    if (this.conversation) {
      await this.endConversation();
    }

    try {
      this.isConnecting = true;
      onStatusChange?.('connecting');

      // 1. Explicitly request microphone access from browser
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const targetAgentId = agentId || import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_2001m787qgn3fbnag9rvn4rvb72x';

      this.conversation = await Conversation.startSession({
        agentId: targetAgentId,
        onConnect: () => {
          this.isConnecting = false;
          onStatusChange?.('connected');
        },
        onDisconnect: () => {
          this.isConnecting = false;
          onStatusChange?.('disconnected');
          this.conversation = null;
        },
        onError: (err) => {
          console.warn('ElevenLabs Live Agent session info/fallback:', err);
          this.isConnecting = false;
          onStatusChange?.('disconnected');
        },
        onModeChange: (mode) => {
          onModeChange?.(mode);
        },
        onMessage: (msg) => {
          onMessage?.(msg);
        }
      });

      return this.conversation;
    } catch (err) {
      console.warn('ElevenLabs agent WebRTC fallback to local voice engine:', err);
      this.isConnecting = false;
      onStatusChange?.('disconnected');
      return null;
    }
  }

  async endConversation() {
    if (this.conversation) {
      try {
        await this.conversation.endSession();
      } catch (e) {
        console.warn('Error closing session:', e);
      }
      this.conversation = null;
    }
  }
}

export const elevenLabsAgent = new ElevenLabsAgentManager();




