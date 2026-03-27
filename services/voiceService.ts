// Voice Service - Web Speech API wrapper for STT and TTS

interface VoiceServiceState {
  isListening: boolean;
  isSpeaking: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsVoice: SpeechSynthesisVoice | null;
}

class VoiceService {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private state: VoiceServiceState = {
    isListening: false,
    isSpeaking: false,
    ttsEnabled: false,
    ttsRate: 1.0,
    ttsVoice: null,
  };
  private listeners: Set<(state: VoiceServiceState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis || null;
    }
  }

  private notify() {
    this.listeners.forEach(fn => fn({ ...this.state }));
  }

  subscribe(fn: (state: VoiceServiceState) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  getState(): VoiceServiceState {
    return { ...this.state };
  }

  // --- Speech-to-Text ---
  isSTTSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }

  startListening(onResult: (text: string) => void, onError?: (error: string) => void): void {
    if (!this.isSTTSupported()) {
      onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      this.state.isListening = false;
      this.notify();
      onError?.(event.error === 'not-allowed' ? 'Microphone access denied.' : `Speech recognition error: ${event.error}`);
    };

    this.recognition.onend = () => {
      this.state.isListening = false;
      this.notify();
    };

    this.recognition.start();
    this.state.isListening = true;
    this.notify();
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.state.isListening = false;
    this.notify();
  }

  // --- Text-to-Speech ---
  isTTSSupported(): boolean {
    return !!this.synth;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  setTTSEnabled(enabled: boolean): void {
    this.state.ttsEnabled = enabled;
    if (!enabled) this.stopSpeaking();
    this.notify();
  }

  setTTSRate(rate: number): void {
    this.state.ttsRate = Math.max(0.5, Math.min(2.0, rate));
    this.notify();
  }

  setTTSVoice(voice: SpeechSynthesisVoice | null): void {
    this.state.ttsVoice = voice;
    this.notify();
  }

  speak(text: string): void {
    if (!this.synth || !text) return;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.state.ttsRate;
    if (this.state.ttsVoice) {
      utterance.voice = this.state.ttsVoice;
    }

    utterance.onstart = () => {
      this.state.isSpeaking = true;
      this.notify();
    };

    utterance.onend = () => {
      this.state.isSpeaking = false;
      this.notify();
    };

    utterance.onerror = () => {
      this.state.isSpeaking = false;
      this.notify();
    };

    this.synth.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.state.isSpeaking = false;
    this.notify();
  }

  // Auto-speak bot responses when TTS is enabled
  autoSpeak(text: string): void {
    if (this.state.ttsEnabled) {
      this.speak(text);
    }
  }
}

export const voiceService = new VoiceService();
export type { VoiceServiceState };
