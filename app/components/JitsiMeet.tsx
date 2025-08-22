'use client';

import { useState } from 'react';

interface JitsiMeetProps {
  onClose: () => void;
}

export default function JitsiMeet({ onClose }: JitsiMeetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const jitsiUrl = 'https://meet.jit.si/?rCounter=1';

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-11/12 h-5/6 max-w-6xl relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">🎥</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Jitsi Meet</h2>
              <p className="text-sm text-gray-600">Video Conferencing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Jitsi Meet...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-red-800 mb-2">Failed to Load</h3>
                <p className="text-red-600 mb-4">Could not load Jitsi Meet. Please check your internet connection.</p>
                <button
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                    // Force reload the iframe
                    const iframe = document.getElementById('jitsi-iframe') as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = iframe.src;
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Jitsi Meet iframe */}
          <iframe
            id="jitsi-iframe"
            src={jitsiUrl}
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen; speaker; display-capture"
            onLoad={handleLoad}
            onError={handleError}
            title="Jitsi Meet Video Conference"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Current URL:</span> {jitsiUrl}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const iframe = document.getElementById('jitsi-iframe') as HTMLIFrameElement;
                  if (iframe) {
                    iframe.src = iframe.src;
                  }
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm transition-colors"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => window.open(jitsiUrl, '_blank')}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
              >
                🌐 Open in New Tab
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
