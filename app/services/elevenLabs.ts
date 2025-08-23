// ElevenLabs TTS Service for Raspberry Pi
// This service provides high-quality text-to-speech using ElevenLabs API

export interface ElevenLabsResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
  audioBlob?: Blob;
}

export class ElevenLabsService {
  private apiKey: string = 'sk_e3779ac57bc219adda7ab91f0a78677b70a2750eed8745db'; // Your API key
  private voiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Default voice: Rachel
  private baseUrl: string = 'https://api.elevenlabs.io/v1';

  constructor() {
    // API key is already set, no need to load from localStorage
    console.log('🔊 ElevenLabs service initialized with API key');
  }

  public setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    if (typeof window !== 'undefined') {
      localStorage.setItem('elevenLabsApiKey', apiKey);
    }
    console.log('🔊 ElevenLabs API key set');
  }

  public setVoiceId(voiceId: string) {
    this.voiceId = voiceId;
    console.log('🔊 ElevenLabs voice ID set to:', voiceId);
  }

  public isConfigured(): boolean {
    return true; // API key is always available
  }

  public getAvailableVoices(): Promise<any[]> {
    if (!this.apiKey) {
      return Promise.reject(new Error('API key not configured'));
    }

    return fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('🔊 Available voices:', data.voices?.length || 0);
      return data.voices || [];
    })
    .catch(error => {
      console.error('❌ Failed to fetch voices:', error);
      throw error;
    });
  }

  public async generateSpeech(text: string): Promise<ElevenLabsResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'API key not configured'
      };
    }

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'No text provided'
      };
    }

    try {
      console.log('🔊 Generating ElevenLabs speech for:', text.substring(0, 50) + '...');
      console.log('🔊 Using voice ID:', this.voiceId);
      console.log('🔊 API endpoint:', `${this.baseUrl}/text-to-speech/${this.voiceId}`);
      
      const requestBody = {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      };
      
      console.log('🔊 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🔊 Response status:', response.status);
      console.log('🔊 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ElevenLabs API error:', response.status, errorText);
        
        if (response.status === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your ElevenLabs API key.'
          };
        } else if (response.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.'
          };
        } else {
          return {
            success: false,
            error: `API error: ${response.status} - ${errorText}`
          };
        }
      }

      const audioBlob = await response.blob();
      console.log('🔊 Audio blob size:', audioBlob.size, 'bytes');
      console.log('🔊 Audio blob type:', audioBlob.type);
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🔊 Created audio URL:', audioUrl);
      
      console.log('✅ ElevenLabs speech generated successfully');
      
      return {
        success: true,
        audioUrl,
        audioBlob
      };

    } catch (error) {
      console.error('❌ ElevenLabs speech generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  public getDefaultVoices() {
    return [
      {
        id: '21m00Tcm4TlvDq8ikWAM',
        name: 'Rachel',
        description: 'Professional female voice'
      },
      {
        id: 'AZnzlk1XvdvUeBnXmlld',
        name: 'Domi',
        description: 'Professional male voice'
      },
      {
        id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        description: 'Friendly female voice'
      },
      {
        id: 'VR6AewLTigWG4xSOukaG',
        name: 'Josh',
        description: 'Friendly male voice'
      }
    ];
  }
}

// Export singleton instance
export const elevenLabsService = new ElevenLabsService();
