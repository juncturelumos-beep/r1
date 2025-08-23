'use client';

import { useState, useEffect } from 'react';
import { elevenLabsService } from '../services/elevenLabs';

export default function ElevenLabsDebug() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testElevenLabsAPI = async () => {
    setIsLoading(true);
    addResult('🔍 Testing ElevenLabs API connection...');
    
    try {
      // Test connection
      const isConnected = await elevenLabsService.testConnection();
      if (isConnected) {
        addResult('✅ ElevenLabs API connection successful');
      } else {
        addResult('❌ ElevenLabs API connection failed');
        return;
      }

      // Test voice generation
      addResult('🎵 Generating test speech...');
      const result = await elevenLabsService.generateSpeech('Hello! This is a test of ElevenLabs text-to-speech.');
      
      if (result.success && result.audioUrl) {
        addResult('✅ Speech generation successful');
        addResult(`🔗 Audio URL: ${result.audioUrl.substring(0, 50)}...`);
        
        // Test audio playback
        await testAudioPlayback(result.audioUrl);
      } else {
        addResult(`❌ Speech generation failed: ${result.error}`);
      }
    } catch (error) {
      addResult(`❌ API test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAudioPlayback = async (audioUrl: string) => {
    addResult('🔊 Testing audio playback...');
    
    try {
      const audio = new Audio();
      
      // Add event listeners
      audio.onloadstart = () => addResult('📥 Audio loading started');
      audio.oncanplay = () => addResult('✅ Audio can play');
      audio.onplay = () => addResult('🎵 Audio started playing');
      audio.onended = () => addResult('✅ Audio finished playing');
      audio.onerror = (error) => {
        addResult(`❌ Audio error: ${audio.error?.message || 'Unknown error'}`);
        console.error('Audio error details:', audio.error);
      };
      audio.onabort = () => addResult('❌ Audio playback aborted');
      
      // Set source and try to play
      audio.src = audioUrl;
      setAudioElement(audio);
      
      addResult('🎯 Attempting to play audio...');
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          addResult('✅ Audio play promise resolved');
        }).catch((error) => {
          addResult(`❌ Audio play promise rejected: ${error.message}`);
          if (error.name === 'NotAllowedError') {
            addResult('🚫 Autoplay blocked - user interaction required');
          }
        });
      }
    } catch (error) {
      addResult(`❌ Audio playback error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testUserInteraction = () => {
    addResult('👆 User interaction test triggered');
    addResult('🔊 This should enable audio capabilities');
    
    // Try to play audio immediately after user interaction
    if (audioElement) {
      addResult('🎵 Attempting to play audio after user interaction...');
      audioElement.play().then(() => {
        addResult('✅ Audio played successfully after user interaction');
      }).catch((error) => {
        addResult(`❌ Audio still failed: ${error.message}`);
      });
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🔊 ElevenLabs Audio Debug</h1>
        
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Tests</h2>
          <div className="flex gap-4">
            <button
              onClick={testElevenLabsAPI}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : '🔍 Test ElevenLabs API'}
            </button>
            <button
              onClick={testUserInteraction}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              👆 Test User Interaction
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              🗑️ Clear Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center">No test results yet. Run some tests to see results here.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono text-gray-700 mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">System Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">User Agent:</p>
              <p className="font-mono text-xs break-all">{navigator.userAgent}</p>
            </div>
            <div>
              <p className="text-gray-600">Platform:</p>
              <p className="font-mono">{navigator.platform}</p>
            </div>
            <div>
              <p className="text-gray-600">ElevenLabs Configured:</p>
              <p className="font-mono">{elevenLabsService.isConfigured() ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-gray-600">Audio Context Support:</p>
              <p className="font-mono">{typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext) ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
