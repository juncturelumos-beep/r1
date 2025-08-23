// Google TTS Service for Raspberry Pi
// Uses Google Translate TTS (free, no API key required)

export interface GoogleTTSResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
  audioBlob?: Blob;
}

export class GoogleTTSService {
  private supportedLanguages: { [key: string]: string } = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'ru': 'ru-RU',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'zh': 'zh-CN'
  };

  constructor() {
    console.log('🔊 Google TTS service initialized');
  }

  /**
   * Generate speech using Google Translate TTS (free, no API key required)
   * This works excellently on Raspberry Pi and over VNC connections
   */
  public async generateSpeech(text: string, language: string = 'en', speed: number = 1.0): Promise<GoogleTTSResponse> {
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'No text provided'
      };
    }

    try {
      console.log('🔊 Generating Google TTS speech for:', text.substring(0, 50) + '...');
      console.log('🔊 Language:', language, 'Speed:', speed);

      // Google Translate TTS has a character limit, so we need to split long text
      const maxChunkLength = 200; // Google TTS limit
      const textChunks = this.splitTextIntoChunks(text, maxChunkLength);
      
      if (textChunks.length === 1) {
        // Single chunk - simple case
        return await this.generateSingleChunk(text, language, speed);
      } else {
        // Multiple chunks - need to concatenate
        return await this.generateMultipleChunks(textChunks, language, speed);
      }

    } catch (error) {
      console.error('❌ Google TTS generation failed:', error);
      return {
        success: false,
        error: `TTS generation failed: ${error}`
      };
    }
  }

  /**
   * Generate speech for a single text chunk
   */
  private async generateSingleChunk(text: string, language: string, speed: number): Promise<GoogleTTSResponse> {
    try {
      const langCode = this.supportedLanguages[language] || 'en-US';
      
      console.log('🔊 Generating Google TTS via API for:', text.substring(0, 50) + '...');

      // Use our backend API to avoid CORS issues
      const response = await fetch('/api/google-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text, 
          language: langCode 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      
      // Create audio URL
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('🔊 Google TTS audio generated successfully');
      console.log('🔊 Audio blob size:', audioBlob.size, 'bytes');
      console.log('🔊 Audio URL created:', audioUrl);

      return {
        success: true,
        audioUrl: audioUrl,
        audioBlob: audioBlob
      };

    } catch (error) {
      console.error('❌ Single chunk TTS failed:', error);
      return {
        success: false,
        error: `Single chunk TTS failed: ${error}`
      };
    }
  }

  /**
   * Generate speech for multiple text chunks and concatenate
   */
  private async generateMultipleChunks(chunks: string[], language: string, speed: number): Promise<GoogleTTSResponse> {
    try {
      console.log(`🔊 Generating ${chunks.length} audio chunks...`);

      // Generate audio for each chunk
      const audioChunks: Blob[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🔊 Generating chunk ${i + 1}/${chunks.length}:`, chunk.substring(0, 30) + '...');
        
        const result = await this.generateSingleChunk(chunk, language, speed);
        
        if (!result.success || !result.audioBlob) {
          throw new Error(`Failed to generate chunk ${i + 1}: ${result.error}`);
        }
        
        audioChunks.push(result.audioBlob);
        
        // Small delay between requests to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Concatenate audio chunks
      const concatenatedBlob = await this.concatenateAudioBlobs(audioChunks);
      const audioUrl = URL.createObjectURL(concatenatedBlob);

      console.log('🔊 Multiple chunks concatenated successfully');
      console.log('🔊 Total audio size:', concatenatedBlob.size, 'bytes');

      return {
        success: true,
        audioUrl: audioUrl,
        audioBlob: concatenatedBlob
      };

    } catch (error) {
      console.error('❌ Multiple chunks TTS failed:', error);
      return {
        success: false,
        error: `Multiple chunks TTS failed: ${error}`
      };
    }
  }

  /**
   * Split text into chunks that fit Google TTS limits
   */
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const word of words) {
      if ((currentChunk + ' ' + word).length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = word;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Concatenate multiple audio blobs into one
   */
  private async concatenateAudioBlobs(blobs: Blob[]): Promise<Blob> {
    try {
      // Convert blobs to array buffers
      const arrayBuffers = await Promise.all(
        blobs.map(blob => blob.arrayBuffer())
      );

      // Calculate total length
      const totalLength = arrayBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
      
      // Create combined array buffer
      const combinedBuffer = new ArrayBuffer(totalLength);
      const combinedView = new Uint8Array(combinedBuffer);
      
      let offset = 0;
      for (const buffer of arrayBuffers) {
        combinedView.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
      }

      // Create new blob
      return new Blob([combinedBuffer], { type: 'audio/mpeg' });

    } catch (error) {
      console.error('❌ Audio concatenation failed:', error);
      throw error;
    }
  }

  /**
   * Get available languages
   */
  public getSupportedLanguages(): { [key: string]: string } {
    return { ...this.supportedLanguages };
  }

  /**
   * Check if language is supported
   */
  public isLanguageSupported(language: string): boolean {
    return language in this.supportedLanguages;
  }

  /**
   * Clean up audio URLs to prevent memory leaks
   */
  public cleanupAudioUrl(audioUrl: string): void {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
      console.log('🔊 Audio URL cleaned up');
    }
  }
}
