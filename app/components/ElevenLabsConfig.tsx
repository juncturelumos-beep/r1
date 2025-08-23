'use client';

import { useState, useEffect } from 'react';
import { elevenLabsService } from '../services/elevenLabs';

interface ElevenLabsConfigProps {
  onClose: () => void;
  onConfigured: () => void;
}

export default function ElevenLabsConfig({ onClose, onConfigured }: ElevenLabsConfigProps) {
  const [selectedVoice, setSelectedVoice] = useState('21m00Tcm4TlvDq8ikWAM');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load voices immediately since API key is already configured
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      setIsLoading(true);
      const voices = await elevenLabsService.getAvailableVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Failed to load voices:', error);
      // Use default voices if API call fails
      setAvailableVoices(elevenLabsService.getDefaultVoices());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setTestResult('🔧 Testing connection...');
      
      // Test the connection
      const isConnected = await elevenLabsService.testConnection();
      
      if (isConnected) {
        setTestResult('✅ Connection successful! ElevenLabs is ready to use!');
        
        // Close after a short delay
        setTimeout(() => {
          onConfigured();
        }, 1500);
      } else {
        setTestResult('❌ Connection failed. Please check your internet connection.');
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult('🎵 Testing speech generation...');
      
      // Test speech generation with format fallback for Raspberry Pi
      const result = await elevenLabsService.generateSpeechWithFallback('Hello! This is a test of the ElevenLabs text-to-speech system.');
      
      if (result.success && result.audioUrl) {
        setTestResult('✅ Test successful! Playing audio...');
        
        // Create audio element with better error handling
        const audio = new Audio();
        
        // Add comprehensive event listeners for debugging
        audio.onloadstart = () => {
          console.log('🔊 Audio loading started');
          setTestResult('🔊 Audio loading started...');
        };
        
        audio.oncanplay = () => {
          console.log('🔊 Audio can play');
          setTestResult('🔊 Audio ready to play...');
        };
        
        audio.onplay = () => {
          console.log('🔊 Audio started playing');
          setTestResult('✅ Audio is now playing!');
        };
        
        audio.onended = () => {
          console.log('🔊 Audio finished playing');
          setTestResult('✅ Test completed successfully!');
        };
        
        audio.onerror = (error) => {
          console.error('❌ Audio playback error:', error);
          console.error('❌ Audio error details:', audio.error);
          setTestResult(`❌ Audio playback failed: ${audio.error?.message || 'Unknown error'}`);
        };
        
        audio.onabort = () => {
          console.log('🔊 Audio playback aborted');
          setTestResult('❌ Audio playback was aborted');
        };
        
        // Set the audio source
        audio.src = result.audioUrl;
        
        // Try to play with user interaction check
        try {
          console.log('🔊 Attempting to play audio...');
          console.log('🔊 Audio URL:', result.audioUrl);
          console.log('🔊 Audio ready state:', audio.readyState);
          
          const playPromise = audio.play();
          
          if (playPromise !== undefined) {
            playPromise.then(() => {
              console.log('✅ Audio play promise resolved successfully');
            }).catch((error) => {
              console.error('❌ Audio play promise rejected:', error);
              setTestResult(`❌ Audio play failed: ${error.message}`);
              
              // Check if it's an autoplay restriction
              if (error.name === 'NotAllowedError') {
                setTestResult('❌ Autoplay blocked - please click the test button again to play audio');
              }
            });
          }
          
        } catch (playError) {
          console.error('❌ Audio play error:', playError);
          setTestResult(`❌ Audio play error: ${playError instanceof Error ? playError.message : 'Unknown error'}`);
        }
        
      } else {
        setTestResult(`❌ Test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Test error:', error);
      setTestResult(`❌ Test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    elevenLabsService.setVoiceId(voiceId);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#08AFC0' }}>🔊 ElevenLabs TTS Configuration</h2>
          <button className="btn" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ marginBottom: '15px', color: 'green', fontWeight: 'bold' }}>
            ✅ ElevenLabs API key is already configured and ready to use!
          </p>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            ElevenLabs provides high-quality text-to-speech that works great on Raspberry Pi. 
            Your robot will now use professional-quality voices for all speech output.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Voice:
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            {availableVoices.length > 0 ? (
              availableVoices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.description}
                </option>
              ))
            ) : (
              elevenLabsService.getDefaultVoices().map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.description}
                </option>
              ))
            )}
          </select>
        </div>

        {testResult && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '12px', 
            borderRadius: '8px',
            backgroundColor: testResult.includes('✅') ? '#d1fae5' : '#fee2e2',
            color: testResult.includes('✅') ? '#065f46' : '#991b1b',
            border: `1px solid ${testResult.includes('✅') ? '#a7f3d0' : '#fecaca'}`
          }}>
            {testResult}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleTest}
            disabled={isLoading || isTesting}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: (isLoading || isTesting) ? 0.5 : 1
            }}
          >
            {isTesting ? 'Testing...' : '🎵 Test'}
          </button>
          
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="btn"
            style={{
              opacity: isLoading ? 0.5 : 1
            }}
          >
            {isLoading ? 'Testing...' : '✅ Activate ElevenLabs'}
          </button>
        </div>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1fae5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#065f46' }}>🎉 Ready to Use!</h4>
          <p style={{ margin: 0, color: '#065f46' }}>
            Your ElevenLabs API key is already configured. Click "🎵 Test" to verify everything works, 
            then click "✅ Activate ElevenLabs" to start using high-quality TTS on your robot!
          </p>
        </div>
      </div>
    </div>
  );
}
