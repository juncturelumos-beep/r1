import React, { useState, useRef, useEffect } from 'react'

interface MP3PlayerProps {
  audioUrl: string
  text: string
  duration: number
  onClose: () => void
  onDelete: () => void
}

export default function MP3Player({ audioUrl, text, duration, onClose, onDelete }: MP3PlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(e => {
        console.error('Play error:', e)
        setIsPlaying(false)
      })
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !progressRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const seekTime = (clickX / width) * duration
    audio.currentTime = seekTime
    setCurrentTime(seekTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDelete = () => {
    // Stop audio if playing
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    onDelete()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ 
        width: 'min(95vw, 500px)', 
        maxHeight: '90vh',
        background: '#111',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#08AFC0' }}>🎵 MP3 Player</h2>
          <button 
            className="btn secondary" 
            onClick={onClose}
            style={{ padding: '8px 12px' }}
          >
            ✕
          </button>
        </div>

        {/* Text Display */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '16px', 
          backgroundColor: 'rgba(8, 175, 192, 0.1)', 
          borderRadius: '8px', 
          border: '1px solid rgba(8, 175, 192, 0.3)',
          color: '#08AFC0',
          fontSize: '16px',
          lineHeight: '1.5'
        }}>
          "{text}"
        </div>

        {/* Audio Element */}
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Play/Pause Button */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button 
            className="btn" 
            onClick={togglePlay}
            style={{ 
              padding: '16px 32px', 
              fontSize: '18px',
              backgroundColor: isPlaying ? '#dc3545' : '#08AFC0',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div 
            ref={progressRef}
            onClick={handleSeek}
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#333',
              borderRadius: '4px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div style={{
              width: `${(currentTime / duration) * 100}%`,
              height: '100%',
              backgroundColor: '#08AFC0',
              borderRadius: '4px',
              transition: 'width 0.1s ease'
            }} />
            <div style={{
              position: 'absolute',
              left: `${(currentTime / duration) * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '16px',
              height: '16px',
              backgroundColor: '#08AFC0',
              borderRadius: '50%',
              border: '2px solid #fff'
            }} />
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '8px',
            fontSize: '14px',
            color: '#888'
          }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume Control */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            color: '#08AFC0',
            fontSize: '14px'
          }}>
            🔊 Volume: {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#333',
              borderRadius: '3px',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            className="btn secondary" 
            onClick={handleDelete}
            style={{ 
              padding: '12px 24px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none'
            }}
          >
            🗑️ Delete MP3
          </button>
          <button 
            className="btn" 
            onClick={onClose}
            style={{ padding: '12px 24px' }}
          >
            ✅ Done
          </button>
        </div>

        {/* Info */}
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '6px',
          fontSize: '12px',
          color: '#888',
          textAlign: 'center'
        }}>
          💡 Tip: You can click on the progress bar to seek to any position
        </div>
      </div>
    </div>
  )
}

