'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/config';

interface AudioFile {
  id: string;
  audioData: string;
  fileName: string;
  timestamp: any;
  fileSize: number;
  mimeType: string;
}

interface AudioPlayerProps {
  onClose: () => void;
  onAudioStateChange?: (isPlaying: boolean) => void;
}

export default function AudioPlayer({ onClose, onAudioStateChange }: AudioPlayerProps) {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [autoPlayNew, setAutoPlayNew] = useState(true);
  const [newFileNotification, setNewFileNotification] = useState<string | null>(null);
  // State to keep track of played audio files
  const [playedAudioFiles, setPlayedAudioFiles] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const playedAudioFilesRef = useRef<string[]>([]);

  console.log('🎵 AudioPlayer component rendering...');

  // Simple debug message function
  const addDebugMessage = (message: string) => {
    console.log('🔍 Debug:', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Show notification for new files
  const showNewFileNotification = (fileName: string) => {
    setNewFileNotification(fileName);
    // Auto-hide after 5 seconds
    setTimeout(() => setNewFileNotification(null), 5000);
  };

  // Set up real-time listener for continuous monitoring
  const setupRealTimeListener = () => {
    console.log('🚀 Setting up continuous real-time listener...');
    addDebugMessage('Setting up continuous real-time listener...');
    
    try {
      const audioQuery = query(
        collection(db, 'audioRecordings'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      // Set up real-time listener that stays active
      const unsubscribe = onSnapshot(audioQuery, (querySnapshot) => {
        console.log('📡 Real-time update:', querySnapshot.size, 'documents');
        addDebugMessage(`Real-time update: ${querySnapshot.size} documents`);
        
        const files: AudioFile[] = [];
        const newFiles: AudioFile[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const audioFile = {
            id: doc.id,
            ...data
          } as AudioFile;
          
          files.push(audioFile);
          
          // Check if this is a new file (not in our current state)
          const isNewFile = !audioFiles.find(existing => existing.id === doc.id);
          if (isNewFile) {
            newFiles.push(audioFile);
            console.log('🆕 New audio file detected:', audioFile.fileName);
            addDebugMessage(`🆕 New audio file: ${audioFile.fileName}`);
            showNewFileNotification(audioFile.fileName);
            
            // Auto-play new files immediately - but only the newest one
            if (autoPlayNew && newFiles.length > 0) {
              // Only play the MOST RECENT file (first in the array since we order by timestamp desc)
              const newestFile = newFiles[0];
  
              // Check if this file has already been played in this session or previously
              if (playedAudioFilesRef.current.includes(newestFile.id)) {
                console.log('⏩ Newest file already played, skipping auto-play:', newestFile.fileName);
                addDebugMessage(`⏩ Skipping auto-play: ${newestFile.fileName} (already played)`);
                return; // Skip auto-playing this file
              }
  
              console.log('🎵 Auto-playing newest audio file:', newestFile.fileName);
              addDebugMessage(`🎵 Auto-playing: ${newestFile.fileName}`);
              
              // Stop any currently playing audio first
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                setCurrentlyPlaying(null);
                // Notify parent that previous audio stopped
                if (onAudioStateChange) {
                  onAudioStateChange(false);
                }
              }
              
              // Small delay to ensure state is updated, then play the new file
              setTimeout(() => {
                playAudio(newestFile);
              }, 500);
            }
          }
        });
        
        setAudioFiles(files);
        
        if (files.length === 0) {
          addDebugMessage('❌ No audio files found');
        } else {
          addDebugMessage(`✅ Monitoring ${files.length} audio files`);
        }
        
        setIsLoading(false);
      }, (error) => {
        console.error('❌ Real-time listener error:', error);
        addDebugMessage(`Real-time error: ${error.message}`);
        setIsLoading(false);
        
        // Auto-retry on error
        setTimeout(() => {
          if (!unsubscribeRef.current) {
            setupRealTimeListener();
          }
        }, 3000);
      });
      
      unsubscribeRef.current = unsubscribe;
      addDebugMessage('✅ Continuous real-time listener active');
      
    } catch (error) {
      console.error('❌ Error setting up listener:', error);
      addDebugMessage(`Setup error: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Simple play function
  const playAudio = (audioFile: AudioFile) => {
    console.log('🎵 Playing audio:', audioFile.fileName);
    addDebugMessage(`Playing: ${audioFile.fileName}`);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setCurrentlyPlaying(audioFile.id);
    
    // Add to played audio files
    setPlayedAudioFiles(prev => {
      const newPlayed = Array.from(new Set([...prev, audioFile.id]));
      playedAudioFilesRef.current = newPlayed;
      localStorage.setItem('playedAudioFiles', JSON.stringify(newPlayed));
      return newPlayed;
    });
    
    // Notify parent that audio is starting
    if (onAudioStateChange) {
      onAudioStateChange(true);
    }

    try {
      if (audioFile.audioData && audioFile.audioData.startsWith('data:')) {
        console.log('🎵 Audio data looks good, creating audio element...');
        
        const audio = new Audio();
        audioRef.current = audio;
        
        audio.src = audioFile.audioData;
        audio.oncanplay = () => {
          console.log('🎵 Audio can play, starting...');
          audio.play().catch(e => console.error('Play error:', e));
        };
        audio.onerror = (e) => {
          console.error('Audio error:', e);
          setCurrentlyPlaying(null);
          // Notify parent that audio stopped due to error
          if (onAudioStateChange) {
            onAudioStateChange(false);
          }
        };
        audio.onended = () => {
          setCurrentlyPlaying(null);
          // Notify parent that audio finished
          if (onAudioStateChange) {
            onAudioStateChange(false);
          }
        };
        
      } else {
        console.error('❌ Invalid audio data:', audioFile.audioData);
        addDebugMessage('Invalid audio data');
        setCurrentlyPlaying(null);
        // Notify parent that audio stopped due to invalid data
        if (onAudioStateChange) {
          onAudioStateChange(false);
        }
      }
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      addDebugMessage(`Play error: ${error.message}`);
      setCurrentlyPlaying(null);
      // Notify parent that audio stopped due to error
      if (onAudioStateChange) {
        onAudioStateChange(false);
      }
    }
  };

  // Manual refresh function
  const refreshAudioFiles = () => {
    console.log('🔄 Manual refresh requested...');
    addDebugMessage('Manual refresh requested...');
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setupRealTimeListener();
  };

  // Test Firebase connection
  const testFirebase = () => {
    console.log('🧪 Testing Firebase connection...');
    addDebugMessage('Testing Firebase connection...');
    
    try {
      console.log('DB object:', db);
      console.log('Collection path:', collection(db, 'audioRecordings'));
      addDebugMessage('Firebase objects created successfully');
    } catch (error) {
      console.error('Firebase test error:', error);
      addDebugMessage(`Firebase error: ${error.message}`);
    }
  };

  // Test real-time listener
  const testRealTime = () => {
    console.log('🧪 Testing real-time listener...');
    addDebugMessage('Testing real-time listener...');
    
    try {
      const testQuery = query(collection(db, 'audioRecordings'), limit(1));
      const unsubscribe = onSnapshot(testQuery, (snapshot) => {
        console.log('Real-time update:', snapshot.size, 'documents');
        addDebugMessage(`Real-time: ${snapshot.size} documents`);
      }, (error) => {
        console.error('Real-time error:', error);
        addDebugMessage(`Real-time error: ${error.message}`);
      });
      
      // Clean up after 5 seconds
      setTimeout(() => {
        unsubscribe();
        addDebugMessage('Real-time test completed');
      }, 5000);
      
    } catch (error) {
      console.error('Real-time test error:', error);
      addDebugMessage(`Real-time error: ${error.message}`);
    }
  };

  // Load on mount
  useEffect(() => {
    console.log('🎵 AudioPlayer mounted, preparing monitoring...');
    addDebugMessage('Component mounted - preparing continuous monitoring');

    // Load played audio files from localStorage BEFORE starting listener
    const storedPlayedFiles = localStorage.getItem('playedAudioFiles');
    if (storedPlayedFiles) {
      try {
        const parsed: string[] = JSON.parse(storedPlayedFiles);
        setPlayedAudioFiles(parsed);
        playedAudioFilesRef.current = parsed;
        addDebugMessage('Loaded played audio files from localStorage');
      } catch (e) {
        console.error('Error parsing played audio files from localStorage', e);
        addDebugMessage('Error loading played files from localStorage');
      }
    }

    // Now start the real-time listener
    setupRealTimeListener();
    
    // Cleanup function
    return () => {
      console.log('🎵 AudioPlayer unmounting, cleaning up...');
      addDebugMessage('Component unmounting, cleaning up listener');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []); // Empty dependency array since we only want this to run once on mount

  console.log('🎵 AudioPlayer render complete, files:', audioFiles.length);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
      >
        ×
      </button>
      
      <h3 className="text-lg font-semibold mb-4">Audio Player</h3>
      
      {/* Status */}
      <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            Status: {isLoading ? 'Loading...' : `${audioFiles.length} audio files found`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Auto-play:</span>
            <button
              onClick={() => setAutoPlayNew(!autoPlayNew)}
              className={`px-2 py-1 text-xs rounded ${
                autoPlayNew 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
              {autoPlayNew ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-700">
            🔴 Real-time listener: {unsubscribeRef.current ? 'ACTIVE' : 'INACTIVE'}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Continuously monitoring for new audio files
          </p>
        </div>
        
        {/* AI Blocking Status */}
        {currentlyPlaying && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-700">
              🚫 AI Processing: BLOCKED (Audio Playing)
            </p>
            <p className="text-xs text-red-600 mt-1">
              Voice recognition and AI queries are paused
            </p>
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={refreshAudioFiles}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh Files'}
        </button>
        
        <button
          onClick={testFirebase}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
        >
          Test Firebase
        </button>
        
        <button
          onClick={testRealTime}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
        >
          Test Real-time
        </button>
        <button
          onClick={() => {
            localStorage.removeItem('playedAudioFiles');
            setPlayedAudioFiles([]);
            addDebugMessage('Cleared played audio files from localStorage');
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Clear Played Files
        </button>
      </div>

      {/* New File Notification */}
      {newFileNotification && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            🆕 New Audio File Detected: {newFileNotification}
          </p>
        </div>
      )}

      {/* Audio Files */}
      <div className="space-y-2 mb-4">
        {audioFiles.length === 0 ? (
          <p className="text-gray-500">No audio files found</p>
        ) : (
          audioFiles.map((audioFile) => (
            <div
              key={audioFile.id}
              className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                currentlyPlaying === audioFile.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => playAudio(audioFile)}
            >
              <p className="font-medium text-sm">{audioFile.fileName}</p>
              <p className="text-xs text-gray-500">
                Size: {(audioFile.fileSize / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-gray-500">
                {audioFile.timestamp?.toDate?.()?.toLocaleString() || 'Unknown date'}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Currently Playing */}
      {currentlyPlaying && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            🎵 Now playing: {audioFiles.find(f => f.id === currentlyPlaying)?.fileName}
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm font-semibold text-gray-800 mb-2">Debug Info:</p>
        <div className="max-h-40 overflow-y-auto">
          {debugInfo.length === 0 ? (
            <p className="text-xs text-gray-500">No debug info yet</p>
          ) : (
            debugInfo.map((message, index) => (
              <p key={index} className="text-xs text-gray-600 font-mono">
                {message}
              </p>
            ))
          )}
        </div>
        <button
          onClick={() => setDebugInfo([])}
          className="mt-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Clear Debug
        </button>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
