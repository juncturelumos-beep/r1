'use client'
import { useEffect, useRef, useState } from 'react'

interface ColorDetectionGameProps {
	onClose: () => void
}

export default function ColorDetectionGame({ onClose }: ColorDetectionGameProps) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [stream, setStream] = useState<MediaStream | null>(null)
	const [currentColor, setCurrentColor] = useState<string>('')
	const [targetColor, setTargetColor] = useState<string>('')
	const [score, setScore] = useState(0)
	const [timeLeft, setTimeLeft] = useState(30)
	const [gameActive, setGameActive] = useState(false)
	const [detectedColor, setDetectedColor] = useState<string>('')
	const [showSuccess, setShowSuccess] = useState(false)
	const [cameraError, setCameraError] = useState<string>('')
	const [gameStarted, setGameStarted] = useState(false)

	const colors = [
		{ 
			name: 'Red', 
			hex: '#FF0000', 
			rgb: [255, 0, 0],
			variants: [
				[220, 20, 60],   // Crimson
				[178, 34, 34],   // Fire brick
				[255, 99, 71],   // Tomato
				[255, 69, 0],    // Red orange
				[139, 0, 0],     // Dark red
				[205, 92, 92],   // Indian red
				[240, 128, 128], // Light coral
			]
		},
		{ 
			name: 'Blue', 
			hex: '#0000FF', 
			rgb: [0, 0, 255],
			variants: [
				[0, 191, 255],   // Deep sky blue
				[30, 144, 255],  // Dodger blue
				[135, 206, 235], // Sky blue
				[70, 130, 180],  // Steel blue
				[0, 0, 139],     // Dark blue
				[25, 25, 112],   // Midnight blue
				[100, 149, 237], // Cornflower blue
			]
		},
		{ 
			name: 'Green', 
			hex: '#00FF00', 
			rgb: [0, 255, 0],
			variants: [
				[0, 128, 0],     // Green
				[34, 139, 34],   // Forest green
				[50, 205, 50],   // Lime green
				[144, 238, 144], // Light green
				[0, 100, 0],     // Dark green
				[124, 252, 0],   // Lawn green
				[152, 251, 152], // Pale green
			]
		},
		{ 
			name: 'Yellow', 
			hex: '#FFFF00', 
			rgb: [255, 255, 0],
			variants: [
				[255, 215, 0],   // Gold
				[255, 255, 224], // Light yellow
				[255, 250, 205], // Lemon chiffon
				[238, 232, 170], // Pale goldenrod
				[189, 183, 107], // Dark khaki
				[255, 228, 181], // Moccasin
				[255, 218, 185], // Peach puff
			]
		},
		{ 
			name: 'Orange', 
			hex: '#FFA500', 
			rgb: [255, 165, 0],
			variants: [
				[255, 140, 0],   // Dark orange
				[255, 127, 80],  // Coral
				[255, 160, 122], // Light salmon
				[255, 99, 71],   // Tomato
				[255, 69, 0],    // Orange red
				[255, 228, 196], // Bisque
				[255, 218, 185], // Peach puff
			]
		},
		{ 
			name: 'Purple', 
			hex: '#800080', 
			rgb: [128, 0, 128],
			variants: [
				[138, 43, 226],  // Blue violet
				[147, 112, 219], // Medium purple
				[186, 85, 211],  // Medium orchid
				[153, 50, 204],  // Dark orchid
				[75, 0, 130],    // Indigo
				[148, 0, 211],   // Dark violet
				[221, 160, 221], // Plum
			]
		},
		{ 
			name: 'Pink', 
			hex: '#FFC0CB', 
			rgb: [255, 192, 203],
			variants: [
				[255, 20, 147],  // Deep pink
				[255, 105, 180], // Hot pink
				[255, 182, 193], // Light pink
				[219, 112, 147], // Pale violet red
				[255, 240, 245], // Lavender blush
				[255, 228, 225], // Misty rose
				[250, 128, 114], // Salmon
			]
		},
		{ 
			name: 'White', 
			hex: '#FFFFFF', 
			rgb: [255, 255, 255],
			variants: [
				[248, 248, 255], // Ghost white
				[245, 245, 245], // White smoke
				[250, 250, 250], // Snow
				[255, 250, 250], // Snow
				[240, 248, 255], // Alice blue
				[245, 255, 250], // Mint cream
				[255, 255, 240], // Ivory
			]
		},
		{ 
			name: 'Black', 
			hex: '#000000', 
			rgb: [0, 0, 0],
			variants: [
				[47, 79, 79],    // Dark slate gray
				[105, 105, 105], // Dim gray
				[128, 128, 128], // Gray
				[169, 169, 169], // Dark gray
				[25, 25, 25],    // Very dark gray
				[64, 64, 64],    // Dark gray
				[96, 96, 96],    // Medium gray
			]
		}
	]

	// Initialize camera
	useEffect(() => {
		const initCamera = async () => {
			try {
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: { width: 640, height: 480, facingMode: 'environment' }
				})
				setStream(mediaStream)
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream
				}
			} catch (error) {
				console.error('Camera access error:', error)
				setCameraError('Unable to access camera. Please allow camera permissions.')
			}
		}
		initCamera()

		return () => {
			if (stream) {
				stream.getTracks().forEach(track => track.stop())
			}
		}
	}, [])

	// Game timer
	useEffect(() => {
		if (!gameActive || timeLeft <= 0) return

		const timer = setInterval(() => {
			setTimeLeft(prev => {
				if (prev <= 1) {
					setGameActive(false)
					return 0
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(timer)
	}, [gameActive, timeLeft])

	// Color detection loop
	useEffect(() => {
		if (!gameActive || !videoRef.current || !canvasRef.current) return

		const detectColor = () => {
			const video = videoRef.current!
			const canvas = canvasRef.current!
			const ctx = canvas.getContext('2d')!

			if (video.readyState === 4) {
				canvas.width = video.videoWidth
				canvas.height = video.videoHeight
				ctx.drawImage(video, 0, 0)

				const centerX = canvas.width / 2
				const centerY = canvas.height / 2
				const regionSize = 50

				const imageData = ctx.getImageData(centerX - regionSize / 2, centerY - regionSize / 2, regionSize, regionSize)
				const data = imageData.data

				let r = 0, g = 0, b = 0
				const pixelCount = data.length / 4

				// Collect all pixel values for better analysis
				const pixels: number[][] = []
				for (let i = 0; i < data.length; i += 4) {
					pixels.push([data[i], data[i + 1], data[i + 2]])
					r += data[i]
					g += data[i + 1]
					b += data[i + 2]
				}

				// Calculate average
				r = Math.round(r / pixelCount)
				g = Math.round(g / pixelCount)
				b = Math.round(b / pixelCount)

				// Apply lighting compensation
				const compensatedRGB = compensateForLighting([r, g, b], pixels)

				const colorResult = findClosestColor(compensatedRGB)
				const detectedColorName = colorResult.color
				const confidence = colorResult.confidence
				
				setDetectedColor(`${detectedColorName} (${confidence.toFixed(1)}%)`)

				// Only accept matches with high confidence (>60%)
				if (detectedColorName.toLowerCase() === targetColor.toLowerCase() && confidence > 60) {
					setScore(prev => prev + 10)
					setShowSuccess(true)
					setNextTarget()
					setTimeout(() => setShowSuccess(false), 1500)
				}
			}
		}

		const interval = setInterval(detectColor, 100)
		return () => clearInterval(interval)
	}, [gameActive, targetColor])

	// Compensate for lighting conditions
	const compensateForLighting = (avgRGB: number[], allPixels: number[][]): number[] => {
		// Calculate brightness and contrast adjustments
		const brightness = (avgRGB[0] + avgRGB[1] + avgRGB[2]) / 3
		
		// Calculate standard deviation for contrast analysis
		const variance = allPixels.reduce((acc, pixel) => {
			const pixelBrightness = (pixel[0] + pixel[1] + pixel[2]) / 3
			return acc + Math.pow(pixelBrightness - brightness, 2)
		}, 0) / allPixels.length
		
		const contrast = Math.sqrt(variance)
		
		// Apply adaptive adjustments based on lighting conditions
		let [r, g, b] = avgRGB
		
		// Low light compensation (brighten colors)
		if (brightness < 80) {
			const boost = Math.min(1.5, (80 - brightness) / 50 + 1)
			r = Math.min(255, r * boost)
			g = Math.min(255, g * boost)
			b = Math.min(255, b * boost)
		}
		
		// High light compensation (reduce overexposure)
		if (brightness > 200) {
			const reduction = Math.max(0.7, 1 - (brightness - 200) / 100)
			r = r * reduction
			g = g * reduction
			b = b * reduction
		}
		
		// Low contrast compensation (enhance color separation)
		if (contrast < 20) {
			const enhancement = 1.2
			const gray = (r + g + b) / 3
			r = Math.min(255, Math.max(0, gray + (r - gray) * enhancement))
			g = Math.min(255, Math.max(0, gray + (g - gray) * enhancement))
			b = Math.min(255, Math.max(0, gray + (b - gray) * enhancement))
		}
		
		return [Math.round(r), Math.round(g), Math.round(b)]
	}

	// Convert RGB to HSV for better color matching
	const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
		r /= 255
		g /= 255
		b /= 255

		const max = Math.max(r, g, b)
		const min = Math.min(r, g, b)
		const diff = max - min

		let h = 0
		let s = max === 0 ? 0 : diff / max
		let v = max

		if (diff !== 0) {
			switch (max) {
				case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break
				case g: h = ((b - r) / diff + 2) / 6; break
				case b: h = ((r - g) / diff + 4) / 6; break
			}
		}

		return [h * 360, s * 100, v * 100]
	}

	// Calculate color distance using weighted HSV and RGB
	const calculateColorDistance = (rgb1: number[], rgb2: number[]): number => {
		// RGB distance
		const rgbDistance = Math.sqrt(
			Math.pow(rgb1[0] - rgb2[0], 2) +
			Math.pow(rgb1[1] - rgb2[1], 2) +
			Math.pow(rgb1[2] - rgb2[2], 2)
		)

		// HSV distance for better perceptual matching
		const hsv1 = rgbToHsv(rgb1[0], rgb1[1], rgb1[2])
		const hsv2 = rgbToHsv(rgb2[0], rgb2[1], rgb2[2])

		// Hue distance (circular)
		let hueDiff = Math.abs(hsv1[0] - hsv2[0])
		if (hueDiff > 180) hueDiff = 360 - hueDiff

		const hsvDistance = Math.sqrt(
			Math.pow(hueDiff * 2, 2) + // Weight hue more heavily
			Math.pow(hsv1[1] - hsv2[1], 2) +
			Math.pow(hsv1[2] - hsv2[2], 2)
		)

		// Combine RGB and HSV distances with weights
		return rgbDistance * 0.3 + hsvDistance * 0.7
	}

	const findClosestColor = (rgb: number[]): { color: string, confidence: number } => {
		let minDistance = Infinity
		let closestColor = colors[0].name
		let bestMatch = { color: colors[0].name, distance: Infinity }

		colors.forEach(color => {
			// Check main color
			const distance = calculateColorDistance(rgb, color.rgb)
			
			if (distance < minDistance) {
				minDistance = distance
				closestColor = color.name
				bestMatch = { color: color.name, distance }
			}

			// Check color variants for better matching
			color.variants.forEach(variant => {
				const variantDistance = calculateColorDistance(rgb, variant)
				
				if (variantDistance < minDistance) {
					minDistance = variantDistance
					closestColor = color.name
					bestMatch = { color: color.name, distance: variantDistance }
				}
			})
		})

		// Calculate confidence score (0-100)
		const maxDistance = 441.67 // Max possible RGB distance
		const confidence = Math.max(0, 100 - (bestMatch.distance / maxDistance) * 100)

		return { color: closestColor, confidence }
	}

	const setNextTarget = () => {
		const randomColor = colors[Math.floor(Math.random() * colors.length)]
		setTargetColor(randomColor.name)
		setCurrentColor(randomColor.hex)
	}

	const startGame = () => {
		if (cameraError) return
		setGameStarted(true)
		setGameActive(true)
		setScore(0)
		setTimeLeft(30)
		setNextTarget()
	}

	const resetGame = () => {
		setGameActive(false)
		setGameStarted(false)
		setScore(0)
		setTimeLeft(30)
		setTargetColor('')
		setDetectedColor('')
		setShowSuccess(false)
	}

	return (
		<div className="modal-backdrop" role="dialog" aria-modal="true">
			<div className="modal-card color-game-modal" style={{ width: 'min(95vw, 800px)', maxHeight: '90vh' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
					<h2 style={{ margin: 0, color: '#08AFC0' }}>Color Detection Game 🎨</h2>
					<button className="btn" onClick={onClose}>Close</button>
				</div>

				{cameraError ? (
					<div style={{ textAlign: 'center', padding: '2rem' }}>
						<p style={{ color: '#ff4444', marginBottom: '1rem' }}>{cameraError}</p>
						<p style={{ opacity: 0.8 }}>Please refresh the page and allow camera access to play this game.</p>
					</div>
				) : (
					<>
						<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '8px 12px', backgroundColor: 'rgba(8, 175, 192, 0.1)', borderRadius: '8px', border: '1px solid rgba(8, 175, 192, 0.3)' }}>
							<div style={{ color: '#08AFC0', fontWeight: 'bold' }}>🏆 Score: {score}</div>
							<div style={{ color: '#08AFC0', fontWeight: 'bold' }}>⏰ Time: {timeLeft}s</div>
							{gameActive && targetColor && (
								<div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#08AFC0', fontWeight: 'bold' }}>
									🎯 Find: 
									<div style={{ width: '20px', height: '20px', backgroundColor: currentColor, border: '2px solid #08AFC0', borderRadius: '4px' }} />
									{targetColor}
								</div>
							)}
						</div>

						<div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
							<div style={{ position: 'relative', border: '3px solid #08AFC0', borderRadius: '12px', overflow: 'hidden', width: '100%', maxWidth: '640px' }}>
								<video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: 'auto', display: 'block' }} />
								<canvas ref={canvasRef} style={{ display: 'none' }} />
								
								<div 
									className={`detection-circle ${gameActive ? 'active' : ''}`}
									style={{ 
										position: 'absolute', 
										top: '50%', 
										left: '50%', 
										transform: 'translate(-50%, -50%)', 
										width: '60px', 
										height: '60px', 
										border: '3px solid #08AFC0', 
										borderRadius: '50%', 
										backgroundColor: 'rgba(8, 175, 192, 0.2)', 
										pointerEvents: 'none'
									}} 
								/>

								{showSuccess && (
									<div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(34, 197, 94, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 'bold', animation: 'successPulse 1.5s ease-out' }}>
										✅ Found it! +10 points
									</div>
								)}
							</div>

							{gameActive && (
								<div style={{ marginTop: '12px', padding: '8px 16px', backgroundColor: 'rgba(42, 42, 42, 0.8)', borderRadius: '20px', color: '#08AFC0', fontWeight: 'bold', textAlign: 'center' }}>
									🔍 Detected: {detectedColor || 'Scanning...'}
								</div>
							)}
						</div>

						<div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: 16 }}>
							{!gameStarted ? (
								<button className="btn" onClick={startGame} style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#08AFC0', color: '#000' }}>
									🎮 Start Game
								</button>
							) : (
								<>
									{!gameActive && (
										<>
											<button className="btn" onClick={startGame} style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#08AFC0', color: '#000' }}>
												🔄 Play Again
											</button>
											<div style={{ marginTop: '16px', textAlign: 'center', padding: '16px', backgroundColor: 'rgba(8, 175, 192, 0.1)', borderRadius: '8px', border: '1px solid rgba(8, 175, 192, 0.3)' }}>
												<h3 style={{ margin: '0 0 8px 0', color: '#08AFC0' }}>🎉 Game Over!</h3>
												<p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#08AFC0' }}>Final Score: {score} points</p>
											</div>
										</>
									)}
									<button className="btn secondary" onClick={resetGame} style={{ padding: '12px 24px', fontSize: '16px' }}>🔄 Reset</button>
								</>
							)}
						</div>

						{!gameStarted && (
							<div style={{ padding: '16px', backgroundColor: 'rgba(8, 175, 192, 0.1)', borderRadius: '8px', border: '1px solid rgba(8, 175, 192, 0.3)', textAlign: 'center' }}>
								<h3 style={{ margin: '0 0 12px 0', color: '#08AFC0' }}>How to Play:</h3>
								<ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#08AFC0', lineHeight: '1.6' }}>
									<li>🎯 Find objects of the target color</li>
									<li>📱 Point the camera at colored objects</li>
									<li>⭕ Center the object in the detection circle</li>
									<li>⏰ Score as many points as possible in 30 seconds!</li>
								</ul>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
