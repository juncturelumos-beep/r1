// Audio generation service for Raspberry Pi compatibility
// This service creates simple, stable audio files that work reliably on Pi

export interface AudioResponse {
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  text: string;
}

export class AudioGenerator {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    // Don't initialize immediately - wait for user interaction
    console.log('🔊 Audio generator created - waiting for user interaction');
  }

  private async initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        
        // For Raspberry Pi, we need to handle suspended state carefully
        if (this.audioContext.state === 'suspended') {
          console.log('🔊 Audio context suspended - will resume on user interaction');
          // Don't set as initialized yet
          return;
        }
        
        this.isInitialized = true;
        console.log('🔊 Audio generator initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize audio generator:', error);
    }
  }

  // Generate simple, stable audio from text (Pi-compatible)
  async generateAudioFromText(text: string): Promise<AudioResponse> {
    if (!this.audioContext) {
      await this.initAudioContext();
    }

    if (!this.audioContext) {
      throw new Error('Audio context not available');
    }

    try {
      // Resume audio context if suspended (required for Raspberry Pi)
      if (this.audioContext.state === 'suspended') {
        console.log('🔊 Resuming suspended audio context...');
        await this.audioContext.resume();
        this.isInitialized = true;
      }

      // Calculate speech duration based on text length
      const wordsPerMinute = 150;
      const wordCount = text.split(' ').length;
      const duration = Math.max(1.5, (wordCount / wordsPerMinute) * 60);

      console.log(`🔊 Generating ${duration.toFixed(1)}s of audio for ${wordCount} words`);

      // Create offline audio context for rendering
      const offlineContext = new OfflineAudioContext(
        1, // mono
        Math.ceil(this.audioContext.sampleRate * duration),
        this.audioContext.sampleRate
      );

      // Create a simple, stable oscillator
      const oscillator = offlineContext.createOscillator();
      const gainNode = offlineContext.createGain();
      
      // Connect audio nodes
      oscillator.connect(gainNode);
      gainNode.connect(offlineContext.destination);

      // Use a simple, pleasant frequency that works well on Pi
      const baseFreq = 220; // A3 note
      oscillator.frequency.setValueAtTime(baseFreq, 0);
      
      // Simple volume envelope - start quiet, fade in, fade out
      gainNode.gain.setValueAtTime(0, 0);
      gainNode.gain.linearRampToValueAtTime(0.2, 0.1); // Fade in
      gainNode.gain.setValueAtTime(0.2, duration * 0.8); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, duration); // Fade out

      // Start and stop the oscillator
      oscillator.start(0);
      oscillator.stop(duration);

      // Render the audio
      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV format (more compatible than MP3)
      const wavBlob = this.audioBufferToWav(renderedBuffer);
      
      // Create audio URL for playback
      const audioUrl = URL.createObjectURL(wavBlob);

      console.log('🔊 Simple audio generated successfully:', { duration, wordCount, audioUrl });

      return {
        audioBlob: wavBlob,
        audioUrl,
        duration,
        text
      };

    } catch (error) {
      console.error('❌ Audio generation failed:', error);
      
      // Fallback: create a simple beep sound
      console.log('🔊 Falling back to simple beep sound');
      return this.createFallbackBeep(text);
    }
  }

  // Create a very simple fallback beep sound
  private createFallbackBeep(text: string): AudioResponse {
    try {
      const duration = 1.0; // 1 second beep
      const sampleRate = 44100;
      const samples = Math.ceil(sampleRate * duration);
      
      // Create a simple sine wave
      const audioBuffer = new AudioContext().createBuffer(1, samples, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      
      const frequency = 440; // A4 note
      for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        channelData[i] = Math.sin(2 * Math.PI * frequency * t) * 0.1; // Low volume
      }
      
      // Convert to WAV
      const wavBlob = this.audioBufferToWav(audioBuffer);
      const audioUrl = URL.createObjectURL(wavBlob);
      
      console.log('🔊 Fallback beep created successfully');
      
      return {
        audioBlob: wavBlob,
        audioUrl,
        duration,
        text
      };
      
    } catch (error) {
      console.error('❌ Even fallback beep failed:', error);
      throw new Error('Audio generation completely failed');
    }
  }

  // Convert AudioBuffer to WAV format (simplified for Pi compatibility)
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Write audio data with better error handling
    let offset = 44;
    try {
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
      }
    } catch (error) {
      console.error('❌ Error writing audio data:', error);
      // Return a minimal valid WAV file if data writing fails
      return new Blob([arrayBuffer.slice(0, 44)], { type: 'audio/wav' });
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Clean up resources
  dispose() {
    if (this.audioContext) {
      try {
      this.audioContext.close();
      } catch (error) {
        console.log('🔊 Audio context close error:', error);
      }
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioGenerator = new AudioGenerator();

