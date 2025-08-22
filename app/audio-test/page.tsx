'use client';

import { useState, useEffect } from 'react';

export default function AudioTest() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioState, setAudioState] = useState<string>('Not created');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const createAudioContext = () => {
    try {
      addTestResult('Creating AudioContext...');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        setAudioContext(context);
        setAudioState(context.state);
        addTestResult(`AudioContext created successfully. State: ${context.state}`);
        
        if (context.state === 'suspended') {
          addTestResult('AudioContext is suspended - this is normal on Pi');
        }
      } else {
        addTestResult('❌ AudioContext not supported in this browser');
      }
    } catch (error) {
      addTestResult(`❌ Failed to create AudioContext: ${error}`);
    }
  };

  const resumeAudioContext = async () => {
    if (!audioContext) {
      addTestResult('❌ No AudioContext to resume');
      return;
    }

    try {
      addTestResult('Attempting to resume AudioContext...');
      await audioContext.resume();
      setAudioState(audioContext.state);
      addTestResult(`AudioContext resumed successfully. New state: ${audioContext.state}`);
    } catch (error) {
      addTestResult(`❌ Failed to resume AudioContext: ${error}`);
    }
  };

  const playTestTone = () => {
    if (!audioContext) {
      addTestResult('❌ No AudioContext available');
      return;
    }

    if (audioContext.state === 'suspended') {
      addTestResult('❌ AudioContext is suspended - cannot play audio');
      return;
    }

    try {
      addTestResult('Playing test tone...');
      
      // Create a simple oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set parameters
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.4);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);
      
      // Start and stop
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
      
      addTestResult('✅ Test tone played successfully');
      
    } catch (error) {
      addTestResult(`❌ Failed to play test tone: ${error}`);
    }
  };

  const testWebSpeechAPI = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      addTestResult('✅ Web Speech API available');
      
      try {
        const utterance = new SpeechSynthesisUtterance('Test speech synthesis');
        utterance.onstart = () => addTestResult('✅ Speech synthesis started');
        utterance.onend = () => addTestResult('✅ Speech synthesis completed');
        utterance.onerror = (event) => addTestResult(`❌ Speech synthesis error: ${event.error}`);
        
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        addTestResult(`❌ Speech synthesis failed: ${error}`);
      }
    } else {
      addTestResult('❌ Web Speech API not available');
    }
  };

  const testSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      addTestResult('✅ Speech Recognition API available');
      
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => addTestResult('✅ Speech recognition started');
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          addTestResult(`✅ Speech recognized: "${transcript}"`);
        };
        recognition.onend = () => addTestResult('✅ Speech recognition ended');
        recognition.onerror = (event: any) => addTestResult(`❌ Speech recognition error: ${event.error}`);
        
        recognition.start();
        
        // Stop after 5 seconds
        setTimeout(() => {
          try {
            recognition.stop();
          } catch (e) {
            // Ignore stop errors
          }
        }, 5000);
        
      } catch (error) {
        addTestResult(`❌ Speech recognition failed: ${error}`);
      }
    } else {
      addTestResult('❌ Speech Recognition API not available');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Handle user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        addTestResult('👆 User interaction detected - audio capabilities enabled');
        
        // Remove event listeners
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [hasUserInteracted]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🔊 Raspberry Pi Audio Test</h1>
        
        {/* User Interaction Status */}
        {!hasUserInteracted && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <strong>⚠️ Important:</strong> Click anywhere on this page to enable audio capabilities. 
            This is required on Raspberry Pi due to autoplay restrictions.
          </div>
        )}
        
        {/* Audio Context Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Audio Context Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Status:</p>
              <p className={`font-mono text-lg ${
                audioState === 'running' ? 'text-green-600' : 
                audioState === 'suspended' ? 'text-yellow-600' : 
                'text-gray-600'
              }`}>
                {audioState}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">User Interaction:</p>
              <p className={`font-mono text-lg ${
                hasUserInteracted ? 'text-green-600' : 'text-red-600'
              }`}>
                {hasUserInteracted ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={createAudioContext}
              disabled={!hasUserInteracted}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create AudioContext
            </button>
            <button
              onClick={resumeAudioContext}
              disabled={!audioContext || audioContext.state !== 'suspended'}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resume AudioContext
            </button>
          </div>
        </div>
        
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Audio Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={playTestTone}
              disabled={!audioContext || audioContext.state === 'suspended'}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎵 Play Test Tone
            </button>
            <button
              onClick={testWebSpeechAPI}
              disabled={!hasUserInteracted}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗣️ Test Speech Synthesis
            </button>
            <button
              onClick={testSpeechRecognition}
              disabled={!hasUserInteracted}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎤 Test Speech Recognition
            </button>
          </div>
        </div>
        
        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            <button
              onClick={clearResults}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Clear
            </button>
          </div>
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
              <p className="text-gray-600">Language:</p>
              <p className="font-mono">{navigator.language}</p>
            </div>
            <div>
              <p className="text-gray-600">Cookie Enabled:</p>
              <p className="font-mono">{navigator.cookieEnabled ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
