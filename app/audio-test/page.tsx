'use client'
import { useState, useEffect } from 'react'

export default function AudioTest() {
	const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
	const [audioStatus, setAudioStatus] = useState<string>('Initializing...')
	const [testResults, setTestResults] = useState<string[]>([])

	const addTestResult = (result: string) => {
		setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
	}

	useEffect(() => {
		addTestResult('Page loaded, checking audio support...')
		
		// Check Web Audio API support
		if (typeof window !== 'undefined') {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
			if (AudioContextClass) {
				addTestResult('✅ Web Audio API supported')
			} else {
				addTestResult('❌ Web Audio API not supported')
			}
		}
	}, [])

	const createAudioContext = () => {
		try {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
			if (AudioContextClass) {
				const context = new AudioContextClass()
				setAudioContext(context)
				addTestResult('✅ Audio context created')
				
				if (context.state === 'suspended') {
					addTestResult('⚠️ Audio context suspended (needs user interaction)')
				} else {
					addTestResult('✅ Audio context running')
				}
			}
		} catch (error) {
			addTestResult(`❌ Failed to create audio context: ${error}`)
		}
	}

	const resumeAudioContext = async () => {
		if (!audioContext) {
			addTestResult('❌ No audio context to resume')
			return
		}

		try {
			await audioContext.resume()
			addTestResult('✅ Audio context resumed')
			setAudioStatus(`Audio Context: ${audioContext.state}`)
		} catch (error) {
			addTestResult(`❌ Failed to resume audio context: ${error}`)
		}
	}

	const playTestTone = () => {
		if (!audioContext) {
			addTestResult('❌ No audio context available')
			return
		}

		try {
			// Create a simple test tone
			const oscillator = audioContext.createOscillator()
			const gainNode = audioContext.createGain()
			
			oscillator.connect(gainNode)
			gainNode.connect(audioContext.destination)
			
			oscillator.frequency.setValueAtTime(440, audioContext.currentTime) // A4 note
			gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
			
			oscillator.start(audioContext.currentTime)
			oscillator.stop(audioContext.currentTime + 1)
			
			addTestResult('🔊 Test tone played (440Hz for 1 second)')
		} catch (error) {
			addTestResult(`❌ Failed to play test tone: ${error}`)
		}
	}

	const playEnhancedAudio = () => {
		if (!audioContext) {
			addTestResult('❌ No audio context available')
			return
		}

		try {
			// Create enhanced voice-like audio (same as fallback system)
			const oscillator = audioContext.createOscillator()
			const gainNode = audioContext.createGain()
			const filterNode = audioContext.createBiquadFilter()
			
			oscillator.connect(filterNode)
			filterNode.connect(gainNode)
			gainNode.connect(audioContext.destination)
			
			// Voice-like characteristics
			filterNode.type = 'lowpass'
			filterNode.frequency.setValueAtTime(800, audioContext.currentTime)
			filterNode.Q.setValueAtTime(1, audioContext.currentTime)
			
			// Dynamic frequency changes
			const baseFreq = 220 // A3 note
			const freqVariations = [0, 2, -2, 4, -4, 2, 0, -2]
			const timeStep = 0.5 // 0.5 seconds per segment
			
			for (let i = 0; i < 8; i++) {
				const time = audioContext.currentTime + (i * timeStep)
				const freq = baseFreq * Math.pow(2, freqVariations[i] / 12)
				
				oscillator.frequency.setValueAtTime(freq, time)
				
				const segmentDuration = timeStep * 0.8
				const fadeIn = timeStep * 0.1
				
				gainNode.gain.setValueAtTime(0, time)
				gainNode.gain.linearRampToValueAtTime(0.4, time + fadeIn)
				gainNode.gain.linearRampToValueAtTime(0, time + segmentDuration)
			}
			
			oscillator.start(audioContext.currentTime)
			oscillator.stop(audioContext.currentTime + 4)
			
			addTestResult('🔊 Enhanced voice-like audio played (4 seconds)')
		} catch (error) {
			addTestResult(`❌ Failed to play enhanced audio: ${error}`)
		}
	}

	return (
		<div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
			<h1>🔊 Audio Test Page</h1>
			<p>Use this page to test the fallback audio system on your Raspberry Pi + VNC setup.</p>
			
			<div style={{ marginBottom: '20px' }}>
				<h3>Audio Context Status</h3>
				<p><strong>Status:</strong> {audioStatus}</p>
				<p><strong>Context:</strong> {audioContext ? `Created (${audioContext.state})` : 'Not created'}</p>
			</div>
			
			<div style={{ marginBottom: '20px' }}>
				<h3>Test Controls</h3>
				<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
					<button 
						onClick={createAudioContext}
						style={{
							padding: '10px 20px',
							backgroundColor: '#007bff',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer'
						}}
					>
						Create Audio Context
					</button>
					
					<button 
						onClick={resumeAudioContext}
						disabled={!audioContext}
						style={{
							padding: '10px 20px',
							backgroundColor: audioContext ? '#28a745' : '#6c757d',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: audioContext ? 'pointer' : 'not-allowed'
						}}
					>
						Resume Audio Context
					</button>
					
					<button 
						onClick={playTestTone}
						disabled={!audioContext}
						style={{
							padding: '10px 20px',
							backgroundColor: audioContext ? '#ffc107' : '#6c757d',
							color: 'black',
							border: 'none',
							borderRadius: '5px',
							cursor: audioContext ? 'pointer' : 'not-allowed'
						}}
					>
						Play Test Tone (440Hz)
					</button>
					
					<button 
						onClick={playEnhancedAudio}
						disabled={!audioContext}
						style={{
							padding: '10px 20px',
							backgroundColor: audioContext ? '#dc3545' : '#6c757d',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: audioContext ? 'pointer' : 'not-allowed'
						}}
					>
						Play Enhanced Audio
					</button>
				</div>
			</div>
			
			<div style={{ marginBottom: '20px' }}>
				<h3>Test Results</h3>
				<div style={{ 
					backgroundColor: '#f8f9fa', 
					padding: '15px', 
					borderRadius: '5px',
					maxHeight: '300px',
					overflowY: 'auto',
					fontFamily: 'monospace',
					fontSize: '14px'
				}}>
					{testResults.map((result, index) => (
						<div key={index} style={{ marginBottom: '5px' }}>{result}</div>
					))}
				</div>
			</div>
			
			<div style={{ marginBottom: '20px' }}>
				<h3>Troubleshooting Steps</h3>
				<ol>
					<li><strong>Click "Create Audio Context"</strong> - This should create the audio context</li>
					<li><strong>Click "Resume Audio Context"</strong> - This resumes if suspended</li>
					<li><strong>Click "Play Test Tone"</strong> - You should hear a 440Hz tone</li>
					<li><strong>Click "Play Enhanced Audio"</strong> - You should hear voice-like patterns</li>
				</ol>
				
				<h4>If you still can't hear audio:</h4>
				<ul>
					<li>Check RealVNC Viewer audio settings</li>
					<li>Ensure "Play audio from remote computer" is enabled</li>
					<li>Try refreshing the page and clicking buttons again</li>
					<li>Check browser console for error messages</li>
				</ul>
			</div>
		</div>
	)
}
