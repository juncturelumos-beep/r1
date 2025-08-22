'use client'
import { useEffect, useRef, useState } from 'react'
import ColorDetectionGame from './components/ColorDetectionGame'
import AudioPlayer from './components/AudioPlayer'
import JitsiMeet from './components/JitsiMeet'
import MP3Player from './components/MP3Player'
import { createReminder, getDueRemindersForToday, toggleReminderComplete } from './services/reminders'
import { audioGenerator, type AudioResponse } from './services/audioGenerator'
import type { ReminderFormData } from './types/reminder'

type ConversationMessage = { role: 'user' | 'assistant'; content: string }

function TicTacToe({ onClose, aiMode = false, onGameEnd }: { onClose: () => void; aiMode?: boolean; onGameEnd?: (result: 'user' | 'ai' | 'draw') => void }) {
	const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null))
	const [xIsNext, setXIsNext] = useState(true)
	const [winner, setWinner] = useState<string | null>(null)
	const [isAiThinking, setIsAiThinking] = useState(false)

	const calculateWinner = (squares: (string | null)[]) => {
		const lines = [
			[0,1,2],[3,4,5],[6,7,8],
			[0,3,6],[1,4,7],[2,5,8],
			[0,4,8],[2,4,6]
		]
		for (const [a,b,c] of lines) {
			if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a]
		}
		if (squares.every(Boolean)) return 'Draw'
		return null
	}

	const getAiMove = (squares: (string | null)[]): number => {
		// AI plays as 'O', user is 'X'
		
		// Check if AI can win
		for (let i = 0; i < 9; i++) {
			if (!squares[i]) {
				const testBoard = squares.slice()
				testBoard[i] = 'O'
				if (calculateWinner(testBoard) === 'O') return i
			}
		}
		
		// Check if AI needs to block user from winning
		for (let i = 0; i < 9; i++) {
			if (!squares[i]) {
				const testBoard = squares.slice()
				testBoard[i] = 'X'
				if (calculateWinner(testBoard) === 'X') return i
			}
		}
		
		// Take center if available
		if (!squares[4]) return 4
		
		// Take corners
		const corners = [0, 2, 6, 8]
		const availableCorners = corners.filter(i => !squares[i])
		if (availableCorners.length > 0) {
			return availableCorners[Math.floor(Math.random() * availableCorners.length)]
		}
		
		// Take any remaining spot
		const available = squares.map((spot, i) => spot === null ? i : null).filter(i => i !== null) as number[]
		return available[Math.floor(Math.random() * available.length)]
	}

	const handleClick = (i: number) => {
		if (board[i] || winner) return
		
		// In AI mode, user is always X and goes first
		if (aiMode && !xIsNext) return // Don't allow clicking during AI's turn
		
		const next = board.slice()
		next[i] = xIsNext ? 'X' : 'O'
		setBoard(next)
		const w = calculateWinner(next)
		if (w) {
			setWinner(w)
			// Trigger game end callback for AI mode
			if (aiMode && onGameEnd) {
				setTimeout(() => {
					if (w === 'Draw') onGameEnd('draw')
					else if (w === 'X') onGameEnd('user')
					else onGameEnd('ai')
				}, 1000) // Give a moment to see the result
			}
			return
		}
		
		if (aiMode && xIsNext) {
			// User just moved, now it's AI's turn
			setXIsNext(false)
			setIsAiThinking(true)
			
			// Add a small delay to make it feel more natural
			setTimeout(() => {
				const aiMove = getAiMove(next)
				if (aiMove !== undefined) {
					const aiBoard = next.slice()
					aiBoard[aiMove] = 'O'
					setBoard(aiBoard)
					const aiWinner = calculateWinner(aiBoard)
					if (aiWinner) {
						setWinner(aiWinner)
						// Trigger game end callback for AI mode
						if (onGameEnd) {
							setTimeout(() => {
								if (aiWinner === 'Draw') onGameEnd('draw')
								else if (aiWinner === 'X') onGameEnd('user')
								else onGameEnd('ai')
							}, 1000) // Give a moment to see the result
						}
					} else {
						setXIsNext(true)
					}
				}
				setIsAiThinking(false)
			}, 800 + Math.random() * 700) // Random delay between 0.8-1.5s
		} else {
			setXIsNext(!xIsNext)
		}
	}

	const reset = () => { 
		setBoard(Array(9).fill(null))
		setXIsNext(true)
		setWinner(null)
		setIsAiThinking(false)
	}

	const getStatusMessage = () => {
		if (winner) {
			if (winner === 'Draw') return "It's a draw!"
			if (aiMode) {
				return winner === 'X' ? "You win! 🎉" : "AI wins! 🤖"
			}
			return `${winner} wins!`
		}
		
		if (aiMode) {
			if (isAiThinking) return "AI is thinking... 🤔"
			return xIsNext ? "Your turn (X)" : "AI's turn (O)"
		}
		
		return `Turn: ${xIsNext ? 'X' : 'O'}`
	}

	return (
		<div className="modal-backdrop" role="dialog" aria-modal="true">
			<div className="tic-tac-toe-modal">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
					<h2 style={{ margin: 0 }}>Tic Tac Toe {aiMode && '🤖'}</h2>
					<div style={{ display: 'flex', gap: 8 }}>
						<button className="btn secondary" onClick={reset}>Reset</button>
						<button className="btn" onClick={onClose}>Close</button>
					</div>
				</div>
				<p style={{ marginTop: 0 }}>{getStatusMessage()}</p>
				<div className="tic-tac-toe-grid">
					{Array.from({ length: 9 }).map((_, i) => (
						<button 
							key={i} 
							className="tic-tac-toe-square" 
							onClick={() => handleClick(i)}
							disabled={aiMode && (!xIsNext || isAiThinking) && !winner}
							style={{ 
								opacity: (aiMode && (!xIsNext || isAiThinking) && !winner) ? 0.5 : 1,
								cursor: (aiMode && (!xIsNext || isAiThinking) && !winner) ? 'not-allowed' : 'pointer'
							}}
						>
							{board[i]}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}

function Trivia({ onClose }: { onClose: () => void }) {
	const [questions, setQuestions] = useState<Array<{ question: string; correct_answer: string; incorrect_answers: string[] }>>([])
	const [index, setIndex] = useState(0)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
	const [showResults, setShowResults] = useState(false)
	const [isProcessingAnswer, setIsProcessingAnswer] = useState(false)

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true)
				// Add timestamp to ensure fresh questions each time
				const timestamp = Date.now()
				const res = await fetch('/api/gemini-trivia', { 
					method: 'POST', 
					headers: { 'Content-Type': 'application/json' }, 
					body: JSON.stringify({ 
						age: 10, 
						subject: 'general', 
						difficulty: 'easy',
						timestamp // This ensures fresh questions each time
					}) 
				})
				const data = await res.json()
				setQuestions(data.questions || [])
			} catch {
				setMessage('Failed to load questions')
			} finally { setLoading(false) }
		}
		load()
	}, []) // Keep empty dependency array but timestamp ensures fresh data

	if (loading) return (
		<div className="modal-backdrop"><div className="modal-card">Loading questions...</div></div>
	)

	const current = questions[index]
	if (!current) return (
		<div className="modal-backdrop"><div className="modal-card"><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><h2 style={{ margin:0 }}>Trivia</h2><button className="btn" onClick={onClose}>Close</button></div><p>{message || 'No questions available.'}</p></div></div>
	)

	const answers = [...current.incorrect_answers, current.correct_answer].sort()
	
	const handleAnswer = (selectedAnswer: string) => {
		if (isProcessingAnswer) return // Prevent multiple clicks
		
		setSelectedAnswer(selectedAnswer)
		setShowResults(true)
		setIsProcessingAnswer(true)
		
		// Wait 2.5 seconds then move to next question
		setTimeout(() => {
			if (index < questions.length - 1) {
				setIndex(index + 1)
				setSelectedAnswer(null)
				setShowResults(false)
				setIsProcessingAnswer(false)
			} else {
				setMessage('Great job! You finished the quiz.')
				setIsProcessingAnswer(false)
			}
		}, 2500)
	}

	const getButtonStyle = (answer: string) => {
		if (!showResults) {
			return { }
		}
		
		const isCorrect = answer === current.correct_answer
		const isSelected = answer === selectedAnswer
		
		if (isCorrect) {
			return {
				backgroundColor: '#22c55e',
				color: 'white',
				border: '2px solid #16a34a'
			}
		} else if (isSelected) {
			return {
				backgroundColor: '#ef4444',
				color: 'white',
				border: '2px solid #dc2626'
			}
		}
		
		return {
			opacity: 0.5
		}
	}

	const getButtonIcon = (answer: string) => {
		if (!showResults) return ''
		
		const isCorrect = answer === current.correct_answer
		const isSelected = answer === selectedAnswer
		
		if (isCorrect) return ' ✓'
		if (isSelected) return ' ✗'
		return ''
	}

	return (
		<div className="modal-backdrop" role="dialog" aria-modal="true">
			<div className="modal-card">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
					<h2 style={{ margin: 0 }}>Trivia</h2>
					<button className="btn" onClick={onClose}>Close</button>
				</div>
				<p style={{ marginTop: 0 }}>{current.question}</p>
				<div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 8 }}>
					{answers.map((a, i) => (
						<button 
							key={i} 
							className="btn secondary" 
							onClick={() => handleAnswer(a)}
							disabled={isProcessingAnswer}
							style={{
								...getButtonStyle(a),
								cursor: isProcessingAnswer ? 'not-allowed' : 'pointer',
								transition: 'all 0.3s ease'
							}}
						>
							{a}{getButtonIcon(a)}
						</button>
					))}
				</div>
				{message && <p>{message}</p>}
			</div>
		</div>
	)
}


function Sudoku({ onClose }: { onClose: () => void }) {
	// Sudoku game state
	const [board, setBoard] = useState<(number | null)[][]>(() => generateEmptyBoard())
	const [originalBoard, setOriginalBoard] = useState<(number | null)[][]>(() => generateEmptyBoard())
	const [selectedCell, setSelectedCell] = useState<{ row: number, col: number } | null>(null)
	const [mistakes, setMistakes] = useState(0)
	const [isComplete, setIsComplete] = useState(false)
	const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
	const [showCelebration, setShowCelebration] = useState(false)
	const [timeElapsed, setTimeElapsed] = useState(0)
	const [gameStarted, setGameStarted] = useState(false)

	// Timer effect
	useEffect(() => {
		if (!gameStarted || isComplete) return
		
		const timer = setInterval(() => {
			setTimeElapsed(prev => prev + 1)
		}, 1000)
		
		return () => clearInterval(timer)
	}, [gameStarted, isComplete])

	// Auto-start game on component mount
	useEffect(() => {
		startNewGame('easy')
	}, [])

	// Generate empty 9x9 board
	function generateEmptyBoard(): (number | null)[][] {
		return Array(9).fill(null).map(() => Array(9).fill(null))
	}

	// Check if a number is valid in the given position
	function isValidMove(board: (number | null)[][], row: number, col: number, num: number): boolean {
		// Check row
		for (let c = 0; c < 9; c++) {
			if (c !== col && board[row][c] === num) return false
		}
		
		// Check column
		for (let r = 0; r < 9; r++) {
			if (r !== row && board[r][col] === num) return false
		}
		
		// Check 3x3 box
		const boxRow = Math.floor(row / 3) * 3
		const boxCol = Math.floor(col / 3) * 3
		for (let r = boxRow; r < boxRow + 3; r++) {
			for (let c = boxCol; c < boxCol + 3; c++) {
				if ((r !== row || c !== col) && board[r][c] === num) return false
			}
		}
		
		return true
	}

	// Generate a complete valid Sudoku board
	function generateCompleteBoard(): (number | null)[][] {
		const board = generateEmptyBoard()
		fillBoard(board)
		return board
	}

	// Fill board using backtracking
	function fillBoard(board: (number | null)[][]): boolean {
		for (let row = 0; row < 9; row++) {
			for (let col = 0; col < 9; col++) {
				if (board[row][col] === null) {
					const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
					for (const num of numbers) {
						if (isValidMove(board, row, col, num)) {
							board[row][col] = num
							if (fillBoard(board)) return true
							board[row][col] = null
						}
					}
					return false
				}
			}
		}
		return true
	}

	// Generate puzzle by removing numbers from complete board
	function generatePuzzle(difficulty: 'easy' | 'medium' | 'hard'): { puzzle: (number | null)[][], solution: (number | null)[][] } {
		const solution = generateCompleteBoard()
		const puzzle = solution.map(row => [...row])
		
		// Number of cells to remove based on difficulty
		const cellsToRemove = {
			easy: 40,
			medium: 50,
			hard: 60
		}[difficulty]
		
		let removed = 0
		while (removed < cellsToRemove) {
			const row = Math.floor(Math.random() * 9)
			const col = Math.floor(Math.random() * 9)
			if (puzzle[row][col] !== null) {
				puzzle[row][col] = null
				removed++
			}
		}
		
		return { puzzle, solution }
	}

	// Start new game
	const startNewGame = (newDifficulty: 'easy' | 'medium' | 'hard' = difficulty) => {
		const { puzzle } = generatePuzzle(newDifficulty)
		setBoard(puzzle)
		setOriginalBoard(puzzle.map(row => [...row]))
		setSelectedCell(null)
		setMistakes(0)
		setIsComplete(false)
		setShowCelebration(false)
		setTimeElapsed(0)
		setGameStarted(true)
		setDifficulty(newDifficulty)
	}

	// Handle cell click
	const handleCellClick = (row: number, col: number) => {
		if (originalBoard[row][col] !== null) return // Can't select pre-filled cells
		setSelectedCell({ row, col })
	}

	// Handle number input
	const handleNumberInput = (num: number) => {
		if (!selectedCell || originalBoard[selectedCell.row][selectedCell.col] !== null) return
		
		const { row, col } = selectedCell
		const newBoard = board.map(row => [...row])
		
		if (newBoard[row][col] === num) {
			// Remove number if clicking the same number
			newBoard[row][col] = null
		} else {
			// Place number
			if (!isValidMove(newBoard, row, col, num)) {
				setMistakes(prev => prev + 1)
				// Still place the number but mark it as wrong
			}
			newBoard[row][col] = num
		}
		
		setBoard(newBoard)
		
		// Check if puzzle is complete
		const isComplete = newBoard.every(row => row.every(cell => cell !== null))
		if (isComplete) {
			setIsComplete(true)
			setGameStarted(false)
			setShowCelebration(true)
			setTimeout(() => setShowCelebration(false), 3000)
		}
	}

	// Format time
	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// Check if a cell has an error
	const hasError = (row: number, col: number): boolean => {
		const num = board[row][col]
		if (!num) return false
		
		// Temporarily remove the number and check if it's valid
		const tempBoard = board.map(r => [...r])
		tempBoard[row][col] = null
		return !isValidMove(tempBoard, row, col, num)
	}

	return (
		<div className="modal-backdrop" role="dialog" aria-modal="true">
			<div className="modal-card" style={{ width: 'min(95vw, 700px)', maxHeight: '85vh' }}>
				{/* Header */}
				<div style={{ 
					display: 'flex', 
					justifyContent: 'space-between', 
					alignItems: 'center', 
					marginBottom: 16
				}}>
					<h2 style={{ margin: 0, color: '#08AFC0' }}>Sudoku 🧩</h2>
					<button className="btn" onClick={onClose}>Close</button>
				</div>

				{/* Game stats */}
				<div style={{ 
					display: 'flex', 
					justifyContent: 'space-between', 
					marginBottom: 16,
					padding: '8px 12px',
					backgroundColor: 'rgba(8, 175, 192, 0.1)',
					borderRadius: '8px',
					border: '1px solid rgba(8, 175, 192, 0.3)'
				}}>
					<div style={{ color: '#08AFC0', fontWeight: 'bold' }}>
						⏱️ {formatTime(timeElapsed)}
					</div>
					<div style={{ color: '#08AFC0', fontWeight: 'bold', textTransform: 'capitalize' }}>
						🎯 {difficulty}
					</div>
					<div style={{ color: mistakes > 0 ? '#ff4444' : '#08AFC0', fontWeight: 'bold' }}>
						❌ {mistakes} mistakes
					</div>
				</div>

				{/* Main game area - side by side layout */}
				<div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
					{/* Sudoku grid */}
					<div style={{ 
						display: 'grid', 
						gridTemplateColumns: 'repeat(9, 1fr)', 
						gap: '1px',
						backgroundColor: '#08AFC0',
						border: '3px solid #08AFC0',
						borderRadius: '8px',
						aspectRatio: '1',
						width: '400px',
						maxWidth: '400px'
					}}>
						{board.map((row, rowIndex) =>
							row.map((cell, colIndex) => {
								const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
								const isOriginal = originalBoard[rowIndex][colIndex] !== null
								const hasErr = hasError(rowIndex, colIndex)
								const isInSameBox = selectedCell && 
									Math.floor(selectedCell.row / 3) === Math.floor(rowIndex / 3) && 
									Math.floor(selectedCell.col / 3) === Math.floor(colIndex / 3)
								const isInSameRowOrCol = selectedCell && 
									(selectedCell.row === rowIndex || selectedCell.col === colIndex)
								
								return (
									<div
										key={`${rowIndex}-${colIndex}`}
										onClick={() => handleCellClick(rowIndex, colIndex)}
										style={{
											aspectRatio: '1',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: '18px',
											fontWeight: 'bold',
											cursor: isOriginal ? 'default' : 'pointer',
											backgroundColor: isSelected ? '#1a5a63' : '#2a2a2a',
											color: hasErr ? '#ff4444' : isOriginal ? '#08AFC0' : '#ffffff',
											borderRadius: '2px',
											border: isSelected ? '2px solid #08AFC0' : '1px solid #3a3a3a',
											transition: 'all 0.2s ease'
										}}
									>
										{cell || ''}
									</div>
								)
							})
						)}
					</div>

					{/* Right side controls */}
					<div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
						{/* Number input buttons */}
						<div>
							<h3 style={{ margin: '0 0 8px 0', color: '#08AFC0', fontSize: '1rem' }}>Numbers:</h3>
							<div style={{ 
								display: 'grid', 
								gridTemplateColumns: 'repeat(3, 1fr)', 
								gap: 6
							}}>
								{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
									<button
										key={num}
										onClick={() => handleNumberInput(num)}
										disabled={!selectedCell || originalBoard[selectedCell.row][selectedCell.col] !== null}
										style={{
											padding: '8px',
											fontSize: '16px',
											fontWeight: 'bold',
											backgroundColor: selectedCell ? '#08AFC0' : 'rgba(8, 175, 192, 0.3)',
											color: selectedCell ? 'white' : '#08AFC0',
											border: '2px solid #08AFC0',
											borderRadius: '6px',
											cursor: selectedCell ? 'pointer' : 'not-allowed',
											opacity: selectedCell ? 1 : 0.5,
											transition: 'all 0.2s ease'
										}}
									>
										{num}
									</button>
								))}
							</div>
							<button
								onClick={() => {
									if (selectedCell && originalBoard[selectedCell.row][selectedCell.col] === null) {
										const newBoard = board.map(row => [...row])
										newBoard[selectedCell.row][selectedCell.col] = null
										setBoard(newBoard)
									}
								}}
								disabled={!selectedCell || originalBoard[selectedCell?.row][selectedCell?.col] !== null}
								style={{
									padding: '8px',
									fontSize: '14px',
									fontWeight: 'bold',
									backgroundColor: selectedCell ? '#ff4444' : 'rgba(255, 68, 68, 0.3)',
									color: 'white',
									border: '2px solid #ff4444',
									borderRadius: '6px',
									cursor: selectedCell ? 'pointer' : 'not-allowed',
									opacity: selectedCell ? 1 : 0.5,
									transition: 'all 0.2s ease',
									width: '100%',
									marginTop: '6px'
								}}
							>
								🗑️ Clear
							</button>
						</div>

						{/* Game controls */}
						<div>
							<h3 style={{ margin: '0 0 8px 0', color: '#08AFC0', fontSize: '1rem' }}>Difficulty:</h3>
							<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
								<button 
									className="btn secondary" 
									onClick={() => startNewGame('easy')}
									style={{ 
										backgroundColor: difficulty === 'easy' ? '#08AFC0' : 'rgba(8, 175, 192, 0.2)',
										color: difficulty === 'easy' ? 'white' : '#08AFC0',
										border: '2px solid #08AFC0',
										padding: '8px 12px',
										fontSize: '14px'
									}}
								>
									🟢 Easy
								</button>
								<button 
									className="btn secondary" 
									onClick={() => startNewGame('medium')}
									style={{ 
										backgroundColor: difficulty === 'medium' ? '#08AFC0' : 'rgba(8, 175, 192, 0.2)',
										color: difficulty === 'medium' ? 'white' : '#08AFC0',
										border: '2px solid #08AFC0',
										padding: '8px 12px',
										fontSize: '14px'
									}}
								>
									🟡 Medium
								</button>
								<button 
									className="btn secondary" 
									onClick={() => startNewGame('hard')}
									style={{ 
										backgroundColor: difficulty === 'hard' ? '#08AFC0' : 'rgba(8, 175, 192, 0.2)',
										color: difficulty === 'hard' ? 'white' : '#08AFC0',
										border: '2px solid #08AFC0',
										padding: '8px 12px',
										fontSize: '14px'
									}}
								>
									🔴 Hard
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Celebration overlay */}
				{showCelebration && (
					<div style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 9999,
						animation: 'celebrationFade 3s ease-out'
					}}>
						<div style={{
							fontSize: '6rem',
							color: '#08AFC0',
							textShadow: '0 0 30px #08AFC0, 0 0 60px #08AFC0',
							animation: 'celebrationBounce 1s ease-out',
							marginBottom: '20px'
						}}>
							🎉
						</div>
						<div style={{
							fontSize: '2rem',
							fontWeight: 'bold',
							color: '#08AFC0',
							textShadow: '0 0 20px #08AFC0',
							marginBottom: '10px'
						}}>
							Puzzle Complete!
						</div>
						<div style={{
							fontSize: '1.2rem',
							color: '#08AFC0',
							opacity: 0.8
						}}>
							Time: {formatTime(timeElapsed)} • Mistakes: {mistakes}
						</div>
					</div>
				)}

				{/* Add celebration animations */}
				<style jsx>{`
					@keyframes celebrationFade {
						0% { opacity: 0; }
						10% { opacity: 1; }
						90% { opacity: 1; }
						100% { opacity: 0; }
					}
					
					@keyframes celebrationBounce {
						0% { 
							transform: scale(0) rotate(-180deg); 
							opacity: 0; 
						}
						50% { 
							transform: scale(1.2) rotate(0deg); 
							opacity: 1; 
						}
						100% { 
							transform: scale(1) rotate(0deg); 
							opacity: 1; 
						}
					}
				`}</style>
			</div>
		</div>
	)
}

export default function Home() {
	const [isSpeaking, setIsSpeaking] = useState(false)
	const [stars, setStars] = useState<{cx: number, cy: number, r: number, opacity: number}[]>([]);
	const [hasUserInteracted, setHasUserInteracted] = useState(false) // Track user interaction for Pi compatibility
	const [selectedAgeGroup, setSelectedAgeGroup] = useState<'CHILD' | 'TEEN-ADULT' | 'OLD' | null>(() => {
		// Load age group from localStorage on component mount
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('oneRoboAgeGroup')
			return saved as 'CHILD' | 'TEEN-ADULT' | 'OLD' | null
		}
		return null
	})

	// Function to save age group to localStorage
	const saveAgeGroup = (ageGroup: 'CHILD' | 'TEEN-ADULT' | 'OLD' | null) => {
		if (typeof window !== 'undefined') {
			if (ageGroup) {
				localStorage.setItem('oneRoboAgeGroup', ageGroup)
			} else {
				localStorage.removeItem('oneRoboAgeGroup')
			}
		}
	}

	// Save age group to localStorage whenever it changes
	useEffect(() => {
		if (selectedAgeGroup) {
			saveAgeGroup(selectedAgeGroup)
		}
	}, [selectedAgeGroup])

	useEffect(() => {
	  const generatedStars = Array.from({ length: 150 }).map(() => ({
	    cx: Math.random() * 1200,
	    cy: Math.random() * 700,
	    r: Math.random() * 2 + 0.5,
	    opacity: Math.random() * 0.5 + 0.2,
	  }));
	  setStars(generatedStars);
	}, []);
	const [transcript, setTranscript] = useState('')
	const [mouthAnimation, setMouthAnimation] = useState(0)
	const [isProcessing, setIsProcessing] = useState(false)
	const [aiResponse, setAiResponse] = useState('')
	const [isListening, setIsListening] = useState(false)
	const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
	const [showTicTacToe, setShowTicTacToe] = useState(false)
	const [showTrivia, setShowTrivia] = useState(false)
	const [showSudoku, setShowSudoku] = useState(false)
	const [showColorGame, setShowColorGame] = useState(false)
	const [showAudioPlayer, setShowAudioPlayer] = useState(false)
	const [showJitsiMeet, setShowJitsiMeet] = useState(false)
	const [ticTacToeAiMode, setTicTacToeAiMode] = useState(false)
	const [pendingGameLaunch, setPendingGameLaunch] = useState<{ game: 'tictactoe' | 'trivia' | 'sudoku' | 'color' | 'audio' | 'jitsi', aiMode: boolean } | null>(null)
	
	// MP3 Player state
	const [showMP3Player, setShowMP3Player] = useState(false)
	const [currentMP3Data, setCurrentMP3Data] = useState<{ audioUrl: string; text: string; duration: number } | null>(null)
	const [speechPermissionGranted, setSpeechPermissionGranted] = useState(false)
	const [voicesLoaded, setVoicesLoaded] = useState(false)
	const [isAudioPlaying, setIsAudioPlaying] = useState(false)
	const [useFallbackAudio, setUseFallbackAudio] = useState(false)
	const [fallbackAudioContext, setFallbackAudioContext] = useState<AudioContext | null>(null)

	// Initialize fallback audio context for Raspberry Pi compatibility
	useEffect(() => {
		if (typeof window !== 'undefined' && !fallbackAudioContext) {
			// Don't create audio context immediately - wait for user interaction
			console.log('🔊 Audio context will be created on first user interaction');
		}
	}, [fallbackAudioContext]);

	// Handle user interactions to enable audio (required for Raspberry Pi)
	useEffect(() => {
		const handleUserInteraction = () => {
			if (!hasUserInteracted) {
				console.log('👆 User interaction detected, enabling audio capabilities');
				console.log('🔊 This fixes Raspberry Pi autoplay restrictions');
				setHasUserInteracted(true);
				
				// Remove event listeners after first interaction
				document.removeEventListener('click', handleUserInteraction);
				document.removeEventListener('touchstart', handleUserInteraction);
				document.removeEventListener('keydown', handleUserInteraction);
			}
		};
		
		// Add event listeners for user interaction
		document.addEventListener('click', handleUserInteraction);
		document.addEventListener('touchstart', handleUserInteraction);
		document.addEventListener('keydown', handleUserInteraction);
		
		return () => {
			document.removeEventListener('click', handleUserInteraction);
			document.removeEventListener('touchstart', handleUserInteraction);
			document.removeEventListener('keydown', handleUserInteraction);
		};
	}, [hasUserInteracted]);

	// Create audio context on user interaction (required by browsers, especially Raspberry Pi)
	const createAudioContextOnInteraction = () => {
		if (fallbackAudioContext || !hasUserInteracted) return; // Wait for user interaction
		
		try {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			if (AudioContextClass) {
				const audioContext = new AudioContextClass();
				console.log('🔊 Audio context created on user interaction');
				
				// For Raspberry Pi, we need to handle the suspended state more carefully
				if (audioContext.state === 'suspended') {
					console.log('🔊 Audio context suspended, will resume on next user interaction');
					// Try to resume immediately for Pi compatibility
					audioContext.resume().then(() => {
						console.log('🔊 Audio context resumed successfully');
						setFallbackAudioContext(audioContext);
					}).catch(error => {
						console.error('❌ Failed to resume audio context:', error);
						// Still set it - it might work on next interaction
						setFallbackAudioContext(audioContext);
					});
				} else {
					setFallbackAudioContext(audioContext);
				}
			} else {
				console.log('❌ AudioContext not supported in this browser');
			}
		} catch (error) {
			console.error('❌ Failed to create audio context on user interaction:', error);
		}
	};

	// Enhanced audio context creation that handles Raspberry Pi restrictions
	const createAndResumeAudioContext = async () => {
		// Require user interaction first
		if (!hasUserInteracted) {
			console.log('🔊 Waiting for user interaction before creating audio context');
			return false;
		}
		
		if (fallbackAudioContext) {
			// If we already have one, just try to resume it
			if (fallbackAudioContext.state === 'suspended') {
				try {
					await fallbackAudioContext.resume();
					console.log('🔊 Existing audio context resumed successfully');
					return true;
				} catch (error) {
					console.error('❌ Failed to resume existing audio context:', error);
					return false;
				}
			}
			return true;
		}
		
		// Create new audio context
		try {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			if (AudioContextClass) {
				const audioContext = new AudioContextClass();
				console.log('🔊 New audio context created');
				
				// Try to resume immediately
				if (audioContext.state === 'suspended') {
					try {
						await audioContext.resume();
						console.log('🔊 New audio context resumed successfully');
					} catch (resumeError) {
						console.error('❌ Failed to resume new audio context:', resumeError);
						// Still set it - it might work on next interaction
						setFallbackAudioContext(audioContext);
						return true;
					}
				}
				
				setFallbackAudioContext(audioContext);
				return true;
			}
		} catch (error) {
			console.error('❌ Failed to create audio context:', error);
		}
		
		return false;
	};

	// Test Web Speech API compatibility on mount
	useEffect(() => {
		// Test after a short delay to ensure everything is loaded
		const timer = setTimeout(() => {
			testSpeechAPI();
		}, 1000);
		
		return () => clearTimeout(timer);
	}, []);

	// Test Web Speech API compatibility
	const testSpeechAPI = () => {
		console.log('🔊 Testing Web Speech API compatibility...');
		console.log('🔊 User Agent:', navigator.userAgent);
		console.log('🔊 Platform:', navigator.platform);
		
		// Check for VNC-specific indicators
		const isVNC = navigator.userAgent.includes('VNC') || 
					  navigator.userAgent.includes('RealVNC') ||
					  navigator.userAgent.includes('TightVNC') ||
					  navigator.userAgent.includes('UltraVNC');
		
		// Check for Raspberry Pi indicators
		const isRaspberryPi = navigator.userAgent.includes('Raspberry') || 
							  navigator.userAgent.includes('Linux') ||
							  navigator.platform.includes('Linux');
		
		console.log('🔊 VNC detected:', isVNC);
		console.log('🔊 Raspberry Pi detected:', isRaspberryPi);
		
		if (isVNC || isRaspberryPi) {
			console.log('🔊 VNC or Raspberry Pi detected - likely to have audio issues, enabling fallback');
			setUseFallbackAudio(true);
			return;
		}
		
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			try {
				const testUtter = new SpeechSynthesisUtterance('test');
				testUtter.onerror = (event) => {
					console.log('❌ Web Speech API failed:', event.error);
					console.log('🔊 Enabling fallback audio for Raspberry Pi compatibility');
					setUseFallbackAudio(true);
				};
				testUtter.onend = () => {
					console.log('✅ Web Speech API working');
					setUseFallbackAudio(false);
				};
				
				// Set a timeout to catch cases where speech synthesis hangs
				const timeout = setTimeout(() => {
					console.log('🔊 Speech synthesis test timed out, enabling fallback');
					setUseFallbackAudio(true);
				}, 3000);
				
				testUtter.onend = () => {
					clearTimeout(timeout);
					console.log('✅ Web Speech API working');
					setUseFallbackAudio(false);
				};
				
				window.speechSynthesis.speak(testUtter);
			} catch (error) {
				console.log('❌ Web Speech API test failed:', error);
				setUseFallbackAudio(true);
			}
		} else {
			console.log('❌ Web Speech API not available, using fallback audio');
			setUseFallbackAudio(true);
		}
	};

	// Enhanced fallback audio using Web Audio API (works on Raspberry Pi)
	const playFallbackAudio = async (text: string) => {
		console.log('🔊 Playing enhanced fallback audio for text:', text);
		
		if (!fallbackAudioContext) {
			console.log('🔊 Creating audio context on demand...');
			const success = await createAndResumeAudioContext();
			
			if (!success) {
				console.log('❌ Audio context creation failed, falling back to text-only');
				setAiResponse(text);
				setTimeout(() => setAiResponse(''), 4000);
				return;
			}
			
			// Wait a bit for audio context to be created, then try again
			setTimeout(() => {
				if (fallbackAudioContext) {
					console.log('🔊 Audio context created, retrying audio playback...');
					playFallbackAudio(text);
				} else {
					console.log('❌ Audio context creation failed, falling back to text-only');
					setAiResponse(text);
					setTimeout(() => setAiResponse(''), 4000);
				}
			}, 1000); // Increased delay for Pi stability
			return;
		}

		try {
			// Ensure audio context is running
			if (fallbackAudioContext.state === 'suspended') {
				console.log('🔊 Audio context suspended, attempting to resume...');
				try {
					await fallbackAudioContext.resume();
					console.log('🔊 Audio context resumed successfully');
					// Small delay for Pi stability
					setTimeout(() => playFallbackAudioInternal(text), 200);
				} catch (error) {
					console.error('❌ Failed to resume audio context:', error);
					// Try to play anyway - it might work
					setTimeout(() => playFallbackAudioInternal(text), 500);
				}
				return;
			}
			
			// Audio context is running, play audio
			playFallbackAudioInternal(text);
			
		} catch (error) {
			console.error('❌ Enhanced fallback audio failed:', error);
			// Fallback to simple beep if enhanced audio fails
			playSimpleFallbackAudio(text);
		}
	};

	// Enhanced internal function to actually play the audio with better stability
	const playFallbackAudioInternal = (text: string) => {
		try {
			// Calculate speech duration based on text length (natural speech rate)
			const wordsPerMinute = 150; // Natural speech rate
			const wordCount = text.split(' ').length;
			const speechDuration = Math.max(1.5, (wordCount / wordsPerMinute) * 60); // Minimum 1.5 seconds
			
			console.log(`🔊 Playing ${speechDuration.toFixed(1)}s of enhanced audio for ${wordCount} words`);
			
			// Create simple, stable audio for Pi compatibility
			const oscillator = fallbackAudioContext!.createOscillator();
			const gainNode = fallbackAudioContext!.createGain();
			
			// Connect audio nodes (simplified for Pi stability)
			oscillator.connect(gainNode);
			gainNode.connect(fallbackAudioContext!.destination);
			
			// Use a simple, pleasant frequency that works well on Pi
			const baseFreq = 220; // A3 note
			oscillator.frequency.setValueAtTime(baseFreq, fallbackAudioContext!.currentTime);
			
			// Simple volume envelope - start quiet, fade in, fade out
			gainNode.gain.setValueAtTime(0, fallbackAudioContext!.currentTime);
			gainNode.gain.linearRampToValueAtTime(0.15, fallbackAudioContext!.currentTime + 0.1); // Fade in
			gainNode.gain.setValueAtTime(0.15, fallbackAudioContext!.currentTime + speechDuration * 0.8); // Sustain
			gainNode.gain.linearRampToValueAtTime(0, fallbackAudioContext!.currentTime + speechDuration); // Fade out
			
			// Start and stop the oscillator with better error handling
			try {
				oscillator.start(fallbackAudioContext!.currentTime);
				oscillator.stop(fallbackAudioContext!.currentTime + speechDuration);
				
				console.log('🔊 Enhanced fallback audio playing successfully');
				
				// Show text response since audio is limited
				setAiResponse(text);
				setTimeout(() => setAiResponse(''), Math.max(4000, speechDuration * 1000));
				
			} catch (oscillatorError) {
				console.error('❌ Oscillator error:', oscillatorError);
				// Fall back to simple beep
				playSimpleFallbackAudio(text);
			}
			
		} catch (error) {
			console.error('❌ Enhanced fallback audio internal failed:', error);
			// Fallback to simple beep if enhanced audio fails
			playSimpleFallbackAudio(text);
		}
	};

	// Enhanced simple fallback audio with better stability
	const playSimpleFallbackAudio = (text: string) => {
		console.log('🔊 Playing simple fallback audio for text:', text);
		
		if (!fallbackAudioContext) {
			console.log('🔊 No audio context available for simple fallback');
			setAiResponse(text);
			setTimeout(() => setAiResponse(''), 4000);
			return;
		}

		try {
			// Create a simple, stable beep sound for Pi compatibility
			const oscillator = fallbackAudioContext.createOscillator();
			const gainNode = fallbackAudioContext.createGain();
			
			// Connect audio nodes
			oscillator.connect(gainNode);
			gainNode.connect(fallbackAudioContext.destination);
			
			// Set stable audio parameters (simplified for Pi)
			oscillator.frequency.setValueAtTime(440, fallbackAudioContext.currentTime); // A4 note
			gainNode.gain.setValueAtTime(0, fallbackAudioContext.currentTime);
			gainNode.gain.linearRampToValueAtTime(0.15, fallbackAudioContext.currentTime + 0.1); // Fade in
			gainNode.gain.setValueAtTime(0.15, fallbackAudioContext.currentTime + 0.4); // Sustain
			gainNode.gain.linearRampToValueAtTime(0, fallbackAudioContext.currentTime + 0.6); // Fade out
			
			// Start and stop with better error handling
			try {
				oscillator.start(fallbackAudioContext.currentTime);
				oscillator.stop(fallbackAudioContext.currentTime + 0.6);
				
				console.log('🔊 Simple fallback audio playing successfully');
				
				// Show text response
				setAiResponse(text);
				setTimeout(() => setAiResponse(''), 4000);
				
			} catch (oscillatorError) {
				console.error('❌ Simple oscillator error:', oscillatorError);
				// Last resort - just show text
				setAiResponse(text);
				setTimeout(() => setAiResponse(''), 4000);
			}
			
		} catch (error) {
			console.error('❌ Simple fallback audio failed:', error);
			// Last resort - just show text
			setAiResponse(text);
			setTimeout(() => setAiResponse(''), 4000);
		}
	};

	const requestSpeechPermission = () => {
		// Create audio context on user interaction
		createAudioContextOnInteraction();
		setSpeechPermissionGranted(true)
	}

	// Handle audio state changes from AudioPlayer
	const handleAudioStateChange = (isPlaying: boolean) => {
		console.log('🎵 Audio state changed:', isPlaying ? 'playing' : 'stopped');
		setIsAudioPlaying(isPlaying);
		
		// If audio is playing, aggressively pause AI processing
		if (isPlaying) {
			console.log('🎵 Audio playing - pausing AI processing and speech');
			
			// Stop AI processing
			setIsProcessing(false);
			
			// Stop any ongoing speech synthesis
			if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
				window.speechSynthesis.cancel();
				window.speechSynthesis.pause();
			}
			
			// Stop voice recognition
			if (recognitionRef.current) {
				try {
					recognitionRef.current.stop();
				} catch (e) {
					console.log('Recognition stop error:', e);
				}
			}
			
			// Reset speaking state
			setIsSpeaking(false);
			
			// Clear any pending AI responses
			setAiResponse('');
			
			// Stop any pending game launches
			setPendingGameLaunch(null);
			
		} else {
			console.log('🎵 Audio stopped - resuming AI processing');
			// Audio stopped, can resume AI processing
			setIsProcessing(false);
			setIsSpeaking(false);
		}
	}

	// Function to manually reset all recognition flags
	const resetRecognitionFlags = () => {
		isStartingRef.current = false
		isStoppingRef.current = false
		shouldListenRef.current = true
		setIsListening(false)
		// Force a fresh start
		setTimeout(() => {
			if (canStartRecognition() && !isAudioPlaying) {
				startRecognition()
			}
		}, 1000)
	}

	// Function to reinitialize recognition if needed
	const reinitializeRecognition = () => {
		if (typeof window === 'undefined') return
		
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
		if (!SpeechRecognition) {
			return
		}
		
		// Clean up existing recognition
		if (recognitionRef.current) {
			try {
				recognitionRef.current.stop()
			} catch (e) {}
		}
		
		// Reset flags
		isStartingRef.current = false
		isStoppingRef.current = false
		setIsListening(false)
		
		// Create new recognition instance
		const recognition = new SpeechRecognition()
		recognition.continuous = true
		recognition.interimResults = true
		recognition.lang = 'en-US'
		
		// Set up event handlers (reuse the same logic from main useEffect)
		recognition.onstart = () => {
			console.log('🎤 Recognition started - listening active')
			setIsListening(true)
			isStartingRef.current = false // Reset starting flag
			isStoppingRef.current = false // Reset stopping flag
			finalTranscriptRef.current = ''
			setTranscript('')
		}
		
		recognition.onresult = (event: any) => {
			// Only process input if we're not speaking or processing
			if (isSpeaking || isProcessing) {
				return
			}

			let interim = ''
			let final = ''
			
			try {
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					if (event.results[i].isFinal) {
						final += event.results[i][0].transcript
					} else {
						interim += event.results[i][0].transcript
					}
				}
			} catch (e) {
				console.error('Error processing recognition results:', e)
				return
			}
			
			finalTranscriptRef.current = final
			setTranscript(final || interim)
			
			// Clear any existing silence timeout
			if (silenceTimeoutRef.current) {
				clearTimeout(silenceTimeoutRef.current)
			}
			
			// If we have interim results, wait for silence before processing
			if (interim.trim() && !final) {
				silenceTimeoutRef.current = setTimeout(() => {
					const current = finalTranscriptRef.current || interim
					if (current.trim() && !isProcessing && !isSpeaking) {
						console.log('🎤 Processing interim result after silence:', current)
						handleSendToGemini(current)
					}
				}, 1500) // Increased to 1.5 seconds for better stability
			}
			
			// If we have final results, process immediately
			if (final.trim() && !isProcessing && !isSpeaking) {
				console.log('🎤 Processing final result:', final)
				handleSendToGemini(final)
			}
		}
		
		recognition.onend = () => {
			console.log('🎤 Recognition ended - checking if should restart')
			setIsListening(false)
			isStartingRef.current = false // Reset starting flag
			isStoppingRef.current = false // Reset stopping flag
			
			// Auto-restart if we should still be listening, but with longer delay
			if (shouldListenRef.current && !isSpeaking && !isProcessing) {
				console.log('🔄 Auto-restarting recognition after delay')
				// Use a much longer delay to avoid rapid restart loops
				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition()
					}
				}, 3000) // Increased delay for better stability
			}
		}
		
		recognition.onerror = (event: any) => {
			console.error('🎤 Recognition error:', event.error)
			setIsListening(false)
			isStartingRef.current = false // Reset starting flag
			isStoppingRef.current = false // Reset stopping flag
			
			// Handle specific error types with better recovery
			if (event.error === 'not-allowed') {
				console.log('🚫 Microphone permission denied')
				return
			} else if (event.error === 'no-speech') {
				console.log('🔇 No speech detected - restarting')
				// Restart immediately for no-speech errors
				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition()
					}
				}, 1000)
			} else if (event.error === 'audio-capture') {
				console.log('🎵 Audio capture error - restarting after delay')
				// Restart after delay for audio capture errors
				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition()
					}
				}, 3000)
			} else {
				console.log('🔄 Other error - restarting after longer delay')
				// Restart on other errors if we should still be listening, but with much longer delay
				if (shouldListenRef.current && !isSpeaking && !isProcessing) {
					setTimeout(() => {
						if (canStartRecognition()) {
							startRecognition()
						}
					}, 8000) // Much longer delay for error recovery to prevent loops
				}
			}
		}
		
		recognitionRef.current = recognition
		
		// Start recognition if we should be listening
		if (shouldListenRef.current && !isProcessing && !isSpeaking) {
			setTimeout(() => {
				if (canStartRecognition()) {
					startRecognition()
				}
			}, 1000)
		}
	}

	// Function to check recognition state
	const checkRecognitionState = () => {
		const recognition = recognitionRef.current
		if (!recognition) {
			return
		}
		
		// State check logic without console output
	}

	// Simplified refs for voice recognition
	const recognitionRef = useRef<any>(null)
	const animationFrameRef = useRef<number | null>(null)
	const finalTranscriptRef = useRef('')
	const silenceTimeoutRef = useRef<any>(null)
	const restartTimeoutRef = useRef<any>(null)
	const shouldListenRef = useRef(true)
	const isStartingRef = useRef(false) // Track if we're in the process of starting
	const isStoppingRef = useRef(false) // Track if we're in the process of stopping
	const lastRestartAttemptRef = useRef(0) // Track last restart attempt to prevent rapid restarts

	// Helper function to check if recognition is in a valid state to start
	const canStartRecognition = () => {
		const recognition = recognitionRef.current
		if (!recognition) return false
		
		// Don't start recognition if audio is playing
		if (isAudioPlaying) {
			console.log('🎵 Recognition blocked - audio is playing');
			return false;
		}
		
		// Check if recognition is already in an active state
		try {
			// Try to access the state property if it exists
			const state = (recognition as any).state
			if (state && (state === 'recording' || state === 'starting')) {

				return false
			}
		} catch (e) {
			// If we can't check state, fall back to our flags
		}
		
		// Check cooldown period (minimum 2 seconds between restart attempts)
		const now = Date.now()
		if (now - lastRestartAttemptRef.current < 2000) {

			return false
		}
		
		return !isListening && !isStartingRef.current && shouldListenRef.current
	}

	// Enhanced recognition start function with better stability
	const startRecognition = () => {
		const recognition = recognitionRef.current
		if (!recognition || !shouldListenRef.current) return
		
		// Aggressively block recognition if audio is playing
		if (isAudioPlaying) {
			console.log('🎵 Recognition blocked - audio is playing');
			return;
		}
		
		// Use the helper function to check if we can start
		if (!canStartRecognition()) {
			return
		}
		
		isStartingRef.current = true
		lastRestartAttemptRef.current = Date.now() // Record restart attempt timestamp
		
		try {
			// Reset any existing state before starting
			if (recognition.state === 'recording') {
				try {
					recognition.stop()
				} catch (e) {
					console.log('Cleanup stop error:', e)
				}
			}
			
			recognition.start()
			console.log('🎤 Recognition started successfully')
		} catch (e) {
			console.error('Recognition start error:', e)
			isStartingRef.current = false
			
			// Handle specific error types with better recovery
			if (e instanceof Error) {
				if (e.name === 'InvalidStateError') {
					console.log('🔄 Invalid state error - resetting recognition')
					// Force reset the recognition state
					try {
						recognition.stop()
						// Reset flags to allow retry
						setIsListening(false)
						isStartingRef.current = false
						isStoppingRef.current = false
					} catch (stopError) {
						console.log('Recognition stop error:', stopError)
					}
					// Retry after a delay
					setTimeout(() => {
						if (canStartRecognition() && !isAudioPlaying) {
							startRecognition()
						}
					}, 2000)
				} else if (e.name === 'NotAllowedError') {
					console.log('🚫 Permission denied - not retrying')
					// Don't retry for permission errors
				} else {
					console.log('🔄 Other error - retrying after delay')
					// Retry other errors with longer delay
					setTimeout(() => {
						if (canStartRecognition() && !isAudioPlaying) {
							startRecognition()
						}
					}, 3000)
				}
			} else {
				console.log('🔄 Unknown error - retrying after delay')
				setTimeout(() => {
					if (canStartRecognition() && !isAudioPlaying) {
						startRecognition()
					}
				}, 3000)
			}
		}
	}

	// Simplified recognition stop function
	const stopRecognition = () => {
		const recognition = recognitionRef.current
		if (!recognition) return
		
		// Prevent multiple simultaneous stop attempts
		if (!isListening || isStoppingRef.current) {

			return
		}
		
		isStoppingRef.current = true
		
		try {

			recognition.stop()
		} catch (e) {

			isStoppingRef.current = false
		}
	}

	// Load voices when component mounts
	useEffect(() => {
		if (typeof window === 'undefined') return
		
		const loadVoices = () => {
			const synth = window.speechSynthesis
			if (synth) {
				const voices = synth.getVoices()
				if (voices.length > 0) {
					setVoicesLoaded(true)
				} else {
					// Try again after a short delay
					setTimeout(loadVoices, 100)
				}
			}
		}
		
		loadVoices()
		
		// Also listen for voiceschanged event
		if (window.speechSynthesis) {
			window.speechSynthesis.onvoiceschanged = loadVoices
		}
		
		return () => {
			if (window.speechSynthesis) {
				window.speechSynthesis.onvoiceschanged = null
			}
		}
	}, [])

	useEffect(() => {
		if (typeof window === 'undefined') return
		
		const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
		if (!SpeechRecognition) return
		
		const recognition = new SpeechRecognition()
		recognition.continuous = true
		recognition.interimResults = true
		recognition.lang = 'en-US'
		
		recognition.onstart = () => {

			setIsListening(true)
			isStartingRef.current = false // Reset starting flag
			finalTranscriptRef.current = ''
			setTranscript('')
		}
		
		recognition.onresult = (event: any) => {
			// Only process input if we're not speaking or processing
			if (isSpeaking || isProcessing) {
				return
			}

			let interim = ''
			let final = ''
			
			for (let i = event.resultIndex; i < event.results.length; ++i) {
				if (event.results[i].isFinal) {
					final += event.results[i][0].transcript
				} else {
					interim += event.results[i][0].transcript
				}
			}
			
			finalTranscriptRef.current = final
			setTranscript(final || interim)
			
			// Clear any existing silence timeout
			if (silenceTimeoutRef.current) {
				clearTimeout(silenceTimeoutRef.current)
			}
			
			// If we have interim results, wait for silence before processing
			if (interim.trim() && !final) {
				silenceTimeoutRef.current = setTimeout(() => {
					const current = finalTranscriptRef.current || interim
					if (current.trim() && !isProcessing && !isSpeaking) {
						handleSendToGemini(current)
					}
				}, 1000) // Wait 1 second of silence
			}
			
			// If we have final results, process immediately
			if (final.trim() && !isProcessing && !isSpeaking) {
				handleSendToGemini(final)
			}
		}
		
		recognition.onend = () => {

			setIsListening(false)
			isStartingRef.current = false // Reset starting flag
			isStoppingRef.current = false // Reset stopping flag
			
							// Auto-restart if we should still be listening, but with longer delay
				if (shouldListenRef.current && !isSpeaking && !isProcessing) {
	
					// Use a much longer delay to avoid rapid restart loops
					setTimeout(() => {
						if (canStartRecognition()) {
							startRecognition()
						}
					}, 2000)
				}
		}
		
		recognition.onerror = (event: any) => {

			setIsListening(false)
			isStartingRef.current = false // Reset starting flag
			isStoppingRef.current = false // Reset stopping flag
			
			// Handle specific error types
			if (event.error === 'not-allowed') {

				return
			}
			
			// Restart on other errors if we should still be listening, but with much longer delay
			if (shouldListenRef.current && !isSpeaking && !isProcessing) {

				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition()
					}
				}, 5000) // Much longer delay for error recovery to prevent loops
			}
		}
		
		recognitionRef.current = recognition
		
		// Start recognition immediately
		startRecognition()
		
		return () => {
			try {
				recognition.stop()
			} catch (e) {}
			// Reset all flags on cleanup
			isStartingRef.current = false
			isStoppingRef.current = false
			shouldListenRef.current = false
		}
	}, [])

	// Enhanced effect to manage when recognition should be active with better stability
	useEffect(() => {
		shouldListenRef.current = !isProcessing && !isSpeaking;
		
		if (shouldListenRef.current) {
			// Start recognition if it's not already running and not in the middle of starting/stopping
			if (!isListening && recognitionRef.current && !isStartingRef.current && !isStoppingRef.current) {
				console.log('🔄 Recognition management: starting recognition');
				
				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition();
					}
				}, 1200); // Slightly increased delay for better stability
			}
		} else {
			// Stop recognition if it's running and not in the middle of stopping
			if (isListening && recognitionRef.current && !isStoppingRef.current) {
				console.log('🔄 Recognition management: stopping recognition');
				stopRecognition();
			}
		}
	}, [isProcessing, isSpeaking, isListening]);

	useEffect(() => {
		const animate = () => { setMouthAnimation(prev => (prev + 0.15) % (Math.PI * 2)); animationFrameRef.current = requestAnimationFrame(animate) }
		animationFrameRef.current = requestAnimationFrame(animate)
		return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
	}, [])

	// Poll for due reminders every 30 seconds
	useEffect(() => {
		let timer: any
		const checkReminders = async () => {
			try {
				const due = await getDueRemindersForToday()
				if (due.length > 0) {
					for (const r of due) {
						const msg = craftReminderSpeech(r.title, r.time)
						speakResponse(msg)
						// Mark completed to avoid repeating
						try { await toggleReminderComplete(r.id, true) } catch {}
					}
				}
			} catch (e) {
				// Ignore polling errors in UI
			}
		}
		// Initial and interval
		checkReminders()
		timer = setInterval(checkReminders, 30000)
		return () => { if (timer) clearInterval(timer) }
	}, [])

	// Enhanced speech synthesis monitor - cleans up stuck speech states with better stability
	useEffect(() => {
		const speechMonitor = setInterval(() => {
			if (typeof window !== 'undefined' && window.speechSynthesis) {
				try {
					// If we think we're speaking but synthesis says we're not, clean up
					if (isSpeaking && !window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
						console.log('🔊 Speech synthesis monitor: cleaning up stuck speaking state');
						setIsSpeaking(false);
						setAiResponse('');
						
						// Restart recognition with better timing
						if (!isProcessing && !isStartingRef.current) {
							setTimeout(() => {
								if (canStartRecognition()) {
									console.log('🔄 Restarting recognition after speech cleanup');
									startRecognition();
								}
							}, 1500); // Reduced delay for better responsiveness
						}
					}
				} catch (error) {
					console.error('🔊 Speech synthesis monitor error:', error);
					// Don't crash the monitor, just log the error
				}
			}
		}, 1500); // Check every 1.5 seconds for better responsiveness

		return () => clearInterval(speechMonitor);
	}, [isSpeaking, isProcessing]);

	// Enhanced voice recognition health check - ensures it stays active with better stability
	useEffect(() => {
		const healthCheck = setInterval(() => {
			try {
				// Only restart if we should be listening, recognition isn't active, and we're not in the middle of starting/stopping
				if (shouldListenRef.current && 
					!isListening && 
					recognitionRef.current && 
					!isSpeaking && 
					!isProcessing && 
					!isStartingRef.current && 
					!isStoppingRef.current) {
					
					console.log('🔍 Recognition health check: restarting inactive recognition');
					
					// Use a longer delay to avoid conflicts with other restart attempts
					setTimeout(() => {
						if (canStartRecognition()) {
							console.log('🔄 Health check restarting recognition');
							startRecognition();
						}
					}, 4000); // Increased delay for better stability
				}
			} catch (error) {
				console.error('🔍 Recognition health check error:', error);
				// Don't crash the health check, just log the error
			}
		}, 5000); // Check every 5 seconds for better stability

		return () => clearInterval(healthCheck);
	}, [shouldListenRef.current, isListening, isSpeaking, isProcessing]);

	const handleGameEnd = (result: 'user' | 'ai' | 'draw') => {
		// Close the game modal
		setShowTicTacToe(false)
		
		// Generate AI response based on result
		let response = ''
		if (result === 'user') {
			const userWinResponses = [
				"Oh no! You got me! Great job! 🎉",
				"Wow, you're really good at this! I didn't see that coming!",
				"You win! I'll have to practice more to beat you next time! 😅",
				"Impressive! You outplayed me there!",
				"Nice moves! You really showed me how it's done! 👏"
			]
			response = userWinResponses[Math.floor(Math.random() * userWinResponses.length)]
		} else if (result === 'ai') {
			const aiWinResponses = [
				"I win this round! 🤖 Want to play again?",
				"Got you! That was a fun game!",
				"Victory is mine! You played well though!",
				"I managed to win that one! Good game!",
				"Success! But you're getting better each time!"
			]
			response = aiWinResponses[Math.floor(Math.random() * aiWinResponses.length)]
		} else {
			const drawResponses = [
				"It's a tie! We're both pretty good at this! 🤝",
				"A draw! Great minds think alike!",
				"Neither of us won that one - well played!",
				"It's a stalemate! We're evenly matched!",
				"A tie game! Want to try again for a tiebreaker?"
			]
			response = drawResponses[Math.floor(Math.random() * drawResponses.length)]
		}
		
		// Speak the AI response
		speakResponse(response)
	}

	const launchGame = (key: 'tictactoe' | 'trivia' | 'sudoku' | 'color' | 'audio' | 'jitsi', aiMode: boolean = true) => {

		
		if (key === 'tictactoe') {

			setTicTacToeAiMode(aiMode)
			setShowTicTacToe(true)
		}
		if (key === 'trivia') {

			setShowTrivia(true);
		}
		if (key === 'sudoku') {

			setShowSudoku(true);
		}
		if (key === 'color') {

			setShowColorGame(true);
		}
		if (key === 'audio') {

			setShowAudioPlayer(true);
		}
		if (key === 'jitsi') {

			setShowJitsiMeet(true);
		}
	}

	const detectGameFromText = (raw: string): 'tictactoe' | 'trivia' | 'sudoku' | 'color' | 'audio' | 'jitsi' | null => {
		const text = (raw || '').toLowerCase()
		// Normalize punctuation and spaces
		const cleaned = text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
		
		console.log('Cleaned text for game detection:', cleaned)
		
		// Common game-starting phrases
		const hasPlayVerb = /\b(let\s*us|lets|let's)?\s*(play|start|launch|open)\b|\b(can\s+we|should\s+we|want\s+to|time\s+to|time\s+for)\s+(play|start)\b|\bi\s+(want|wanna)\s+(to\s+)?(play|start)\b/.test(cleaned)
		
		// Tic Tac Toe synonyms - more comprehensive
		const ticTacPatterns = [
			/\btic\s*tac\s*toe\b/, /\btictactoe\b/, /\bxo\b/, /\bnoughts\s*and\s*crosses\b/,
			/\bx\s*and\s*o\b/, /\bx\s*o\b/, /\btic\s*tac\b/
		]
		if (ticTacPatterns.some(rx => rx.test(cleaned))) return 'tictactoe'
		
		// Trivia synonyms - more comprehensive  
		const triviaPatterns = [
			/\btrivia\b/, /\bquiz\b/, /\bquestion\s*game\b/, /\bquestions\b/,
			/\btrivial\s*pursuit\b/, /\bbrain\s*teaser\b/, /\bknowledge\s*test\b/
		]
		if (triviaPatterns.some(rx => rx.test(cleaned))) return 'trivia'
		
		// Sudoku synonyms
		const sudokuPatterns = [
			/\bsudoku\b/, /\bnumber\s*puzzle\b/, /\bnumber\s*game\b/, /\b9\s*by\s*9\b/,
			/\bnumbers\s*grid\b/, /\bpuzzle\s*grid\b/, /\bsuduko\b/, /\bsodoku\b/
		]
		if (sudokuPatterns.some(rx => rx.test(cleaned))) return 'sudoku'
		
		// Color detection game synonyms
		const colorPatterns = [
			/\bcolou?r\s*(?:detection\s*)?game\b/, /\bcolou?r\s*hunt\b/, /\bcolou?r\s*finder\b/, /\bfind\s*colou?r\b/, /\bcolou?r\s*match\b/, /\bcolou?r\s*challenge\b/, /\bcamera\s*game\b/, /\bcolou?r\s*scanner\b/, /\bdetect\s*colou?r\b/, /\bthe\s*colou?r\s*game\b/, /\bplay\s*colou?r\s*game\b/, /\bcolou?r\s*play\b/
		]
		if (colorPatterns.some(rx => rx.test(cleaned))) return 'color'
		
		// Audio player synonyms
		const audioPatterns = [
			/\baudio\s*player\b/, /\baudio\s*game\b/, /\bplay\s*audio\b/, /\bplay\s*music\b/,
			/\bplay\s*sound\b/, /\baudio\s*recorder\b/, /\blisten\s*to\b/, /\bsound\s*game\b/,
			/\bvoice\s*recorder\b/, /\bplay\s*voice\b/, /\bplay\s*recording\b/
		]
		if (audioPatterns.some(rx => rx.test(cleaned))) return 'audio'
		
		// Jitsi Meet synonyms
		const jitsiPatterns = [
			/\bjitsi\b/, /\bjitsi\s*meet\b/, /\bvideo\s*conference\b/, /\bvideo\s*chat\b/,
			/\bmeeting\b/, /\bvideo\s*call\b/, /\bconference\s*call\b/, /\bteam\s*meeting\b/,
			/\bzoom\b/, /\bmeet\b/, /\bvideo\s*meeting\b/, /\bstart\s*meeting\b/
		]
		if (jitsiPatterns.some(rx => rx.test(cleaned))) return 'jitsi'
		
		// Generic "play <game>" capture (supports single word names like trivia)
		if (hasPlayVerb) {
			const afterPlay = cleaned.match(/(?:play|open|start|launch|begin)\s+([a-z0-9\s]+)/)
			const candidate = (afterPlay?.[1] || '').trim()
			if (candidate) {
				if (ticTacPatterns.some(rx => rx.test(candidate))) return 'tictactoe'
				if (triviaPatterns.some(rx => rx.test(candidate))) return 'trivia'
				if (sudokuPatterns.some(rx => rx.test(candidate))) return 'sudoku'
				if (colorPatterns.some(rx => rx.test(candidate))) return 'color'
				if (audioPatterns.some(rx => rx.test(candidate))) return 'audio'
				if (jitsiPatterns.some(rx => rx.test(candidate))) return 'jitsi'
			}
		}
		
		// Also catch standalone mentions in game context
		if (/\bgame\b/.test(cleaned)) {
			if (ticTacPatterns.some(rx => rx.test(cleaned))) return 'tictactoe'
			if (triviaPatterns.some(rx => rx.test(cleaned))) return 'trivia'
			if (sudokuPatterns.some(rx => rx.test(cleaned))) return 'sudoku'
			if (colorPatterns.some(rx => rx.test(cleaned))) return 'color'
			if (audioPatterns.some(rx => rx.test(cleaned))) return 'audio'
			if (jitsiPatterns.some(rx => rx.test(cleaned))) return 'jitsi'
		}
		
		return null
	}

	// Parse simple reminder intents like:
	// - "remind me to buy milk at 7 pm"
	// - "set a reminder for meeting at 14:30"
	// - "remind me at 8:15 to call mom"
	const detectReminderFromText = (raw: string): ReminderFormData | null => {
		const text = (raw || '').toLowerCase()
		if (!/(remind\s+me|set\s+(a\s+)?reminder|add\s+(a\s+)?reminder|make\s+(a\s+)?reminder|create\s+(a\s+)?reminder|remember\s+to)/i.test(text)) return null

		// Extract time phrases (optional)
		const time = extractTimeFromText(text)

		// Extract title around "to", "for", or "of"
		let title = ''
		// Try pattern: remind me to <title> at <time>
		const toMatch = text.match(/remind\s+me\s+to\s+(.+?)\s+at\s+[0-9:apm\.\s]+/)
		if (toMatch && toMatch[1]) title = toMatch[1].trim()
		// Try pattern: set a reminder for <title> at <time>
		if (!title) {
			const forMatch = text.match(/reminder\s+for\s+(.+?)\s+at\s+[0-9:apm\.\s]+/)
			if (forMatch && forMatch[1]) title = forMatch[1].trim()
		}
		// Try pattern: remind me at <time> to <title>
		if (!title) {
			const atThenTo = text.match(/remind\s+me\s+at\s+[0-9:apm\.\s]+\s+to\s+(.+)/)
			if (atThenTo && atThenTo[1]) title = atThenTo[1].trim()
		}
		// New: set/add/make/create reminder to <title>
		if (!title) {
			const setTo = text.match(/(?:set|add|make|create)\s+(?:a\s+)?reminder\s+(?:to|for|of)\s+(.+)/)
			if (setTo && setTo[1]) title = setTo[1].trim()
		}
		// New: reminder of <title>
		if (!title) {
			const ofMatch = text.match(/reminder\s+of\s+(.+)/)
			if (ofMatch && ofMatch[1]) title = ofMatch[1].trim()
		}
		// New: remember to <title>
		if (!title) {
			const remember = text.match(/remember\s+to\s+(.+)/)
			if (remember && remember[1]) title = remember[1].trim()
		}

		// Fallback: if still empty, grab words after "remind me" up to "at"
		if (!title) {
			const generic = text.match(/remind\s+me\s+(?:to\s+)?(.+?)\s+at\s+[0-9:apm\.\s]+/)
			if (generic && generic[1]) title = generic[1].trim()
		}

		// Clean title
		title = title.replace(/\s+$/, '')
		// Trim trailing filler like "for me", "please", and any trailing "at <time>" duplicates
		title = title.replace(/\s*(?:please|for\s+me)\s*$/i, '')
		if (time) {
			// Remove any trailing "at <time>" snippet from title
			title = title.replace(/\s+at\s+[0-9:apm\.\s]+$/i, '').trim()
		}
		// Remove leading time fragments from title (e.g., "18:50 p.m. buy milk")
		title = title.replace(/^(?:\d{1,2}:\d{2}|\d{3,4}|\d{1,2})(?:\s*(?:a\.?m\.?|p\.?m\.?|am|pm))?[\s.,-]+/i, '').trim()
		// Fallback: if still empty, set a generic title
		if (!title) title = 'Reminder'

		const reminder: ReminderFormData = {
			title,
			time,
			repeatMode: 'today'
		}
		return reminder
	}

	// Convert time expressions to HH:mm (24h)
	const extractTimeFromText = (text: string): string | null => {
		// noon/midnight
		if (/\bat\s+noon\b/.test(text)) return '12:00'
		if (/\bat\s+midnight\b/.test(text)) return '00:00'

		// HH:MM (24h)
		const hhmm24 = text.match(/\b(\d{1,2}):(\d{2})\b/)
		if (hhmm24) {
			const h = Math.max(0, Math.min(23, parseInt(hhmm24[1], 10)))
			const m = Math.max(0, Math.min(59, parseInt(hhmm24[2], 10)))
			return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
		}

		// H(:MM)? am/pm (allow dots and optional spaces: a.m., p. m., etc.)
		const ampm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\b/)
		if (ampm) {
			let h = parseInt(ampm[1], 10)
			const m = ampm[2] ? parseInt(ampm[2], 10) : 0
			const isPM = /p/i.test(ampm[3])
			if (h <= 12) {
				if (h === 12) h = isPM ? 12 : 0
				else if (isPM) h += 12
			}
			return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
		}

		// at H MM (space separated) with optional am/pm, e.g. "at 18 53" or "at 6 53 pm"
		const spaced = text.match(/\bat\s+(\d{1,2})\s+(\d{2})(?:\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm))?\b/)
		if (spaced) {
			let h = parseInt(spaced[1], 10)
			const m = parseInt(spaced[2], 10)
			const suffix = spaced[3]
			if (suffix) {
				const isPM = /p/i.test(suffix)
				if (h === 12) h = isPM ? 12 : 0
				else if (isPM) h += 12
			}
			return `${Math.max(0, Math.min(23, h)).toString().padStart(2, '0')}:${Math.max(0, Math.min(59, m)).toString().padStart(2, '0')}`
		}

		// H MM anywhere (space separated) with optional am/pm, e.g. "18 53" or "6 53 pm"
		const spacedAnywhere = text.match(/\b(\d{1,2})\s+(\d{2})(?:\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm))?(?=[^a-z]|$)/i)
		if (spacedAnywhere) {
			let h = parseInt(spacedAnywhere[1], 10)
			const m = parseInt(spacedAnywhere[2], 10)
			const suffix = spacedAnywhere[3]
			if (suffix) {
				const isPM = /p/i.test(suffix)
				if (h === 12) h = isPM ? 12 : 0
				else if (isPM) h += 12
			}
			return `${Math.max(0, Math.min(23, h)).toString().padStart(2, '0')}:${Math.max(0, Math.min(59, m)).toString().padStart(2, '0')}`
		}

		// at HHMM or HMM (compact digits), e.g. "at 1853" or "at 853"
		const compact = text.match(/\bat\s+(\d{3,4})\b/)
		if (compact) {
			const num = parseInt(compact[1], 10)
			let h = Math.floor(num / 100)
			let m = num % 100
			if (h > 23) h = 23
			if (m > 59) m = 59
			return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
		}

		// HH:MM with am/pm suffix allowing dots, e.g. "18:50 p.m." (we ignore suffix if 24h hour)
		const hhmm12 = text.match(/\b(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\b/)
		if (hhmm12) {
			let h = parseInt(hhmm12[1], 10)
			const m = parseInt(hhmm12[2], 10)
			const isPM = /p/i.test(hhmm12[3])
			if (h <= 12) {
				if (h === 12) h = isPM ? 12 : 0
				else if (isPM) h += 12
			}
			return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
		}

		// Compact digits with am/pm suffix, e.g. "1853 p.m." or "853 pm"
		const compactWithSuffix = text.match(/\b(\d{3,4})\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)(?=[^a-z]|$)/i)
		if (compactWithSuffix) {
			const num = parseInt(compactWithSuffix[1], 10)
			let h = Math.floor(num / 100)
			let m = num % 100
			const isPM = /p/i.test(compactWithSuffix[2])
			if (h <= 12) {
				if (h === 12) h = isPM ? 12 : 0
				else if (isPM) h += 12
			}
			if (h > 23) h = 23
			if (m > 59) m = 59
			return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
		}

		// Naked 3-4 digit time anywhere, e.g. "1853"
		const compactAnywhere = text.match(/\b(\d{3,4})\b(?=[^a-z]|$)/)
		if (compactAnywhere) {
			const num = parseInt(compactAnywhere[1], 10)
			let h = Math.floor(num / 100)
			let m = num % 100
			if (h > 23 || m > 59) {
				// Ignore unrealistic combos
			} else {
				return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
			}
		}

		// Bare H with am/pm suffix anywhere, e.g. "6 pm"
		const hourWithSuffix = text.match(/\b(\d{1,2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|am|pm)\b/)
		if (hourWithSuffix) {
			let h = parseInt(hourWithSuffix[1], 10)
			const isPM = /p/i.test(hourWithSuffix[2])
			if (h === 12) h = isPM ? 12 : 0
			else if (isPM) h += 12
			return `${Math.max(0, Math.min(23, h)).toString().padStart(2, '0')}:00`
		}

		// at H (assume current day, minutes 00)
		const atH = text.match(/\bat\s+(\d{1,2})\b(?!\s*[:\d])/)
		if (atH) {
			const h = Math.max(0, Math.min(23, parseInt(atH[1], 10)))
			return `${h.toString().padStart(2, '0')}:00`
		}

		return null
	}

	const formatTimeForSpeech = (hhmm: string): string => {
		const [hStr, mStr] = hhmm.split(':')
		let h = parseInt(hStr, 10)
		const m = parseInt(mStr, 10)
		const suffix = h >= 12 ? 'PM' : 'AM'
		h = h % 12
		if (h === 0) h = 12
		return `${h}:${m.toString().padStart(2, '0')} ${suffix}`
	}

	// Create a crafted, friendly reminder message
	const craftReminderSpeech = (rawTitle: string, time?: string): string => {
		const title = (rawTitle || '').trim()
		const timeStr = time ? formatTimeForSpeech(time) : ''
		const hour = new Date().getHours()
		const timeEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : hour < 21 ? '🌆' : '🌙'

		const lower = title.toLowerCase()
		const cap = title.charAt(0).toUpperCase() + title.slice(1)

		const sayTime = timeStr ? ` It's ${timeStr}.` : ''

		if (lower.startsWith('call ')) return `${timeEmoji} Quick check-in time: ${cap}.${sayTime ? sayTime : ''}`.trim()
		if (lower.startsWith('text ') || lower.startsWith('message ')) return `${timeEmoji} Send a note: ${cap}.${sayTime ? sayTime : ''}`.trim()
		if (lower.startsWith('drink ') || lower.includes('water')) return `💧 Hydration break! ${cap}.${sayTime ? sayTime : ''}`.trim()
		if (lower.startsWith('take ')) return `⏰ Time to ${lower}.` + (sayTime ? sayTime : '')
		if (lower.includes('meeting') || lower.includes('meet')) return `📅 Your meeting starts now: ${cap}.${sayTime ? sayTime : ''}`.trim()
		if (lower.includes('medicine') || lower.includes('meds')) return `💊 Please take your medicine now.${sayTime ? ' ' + timeStr : ''}`.trim()
		if (lower.includes('birthday')) return `🎉 Don't miss it—${cap}.${sayTime ? sayTime : ''}`.trim()
		if (lower.includes('pay') || lower.includes('bill') || lower.includes('tax')) return `💼 Friendly nudge: ${cap}.${sayTime ? sayTime : ''}`.trim()

		const starters = [
			`${timeEmoji} Little nudge: ${cap}.`,
			`${timeEmoji} Heads up—${cap}.`,
			`${timeEmoji} Hey! It's time: ${cap}.`,
			`${timeEmoji} Reminder for you: ${cap}.`
		]
		const base = starters[Math.floor(Math.random() * starters.length)]
		return base + (timeStr ? ` It's ${timeStr}.` : '')
	}

	const handleSendToGemini = async (text: string) => {
		if (isProcessing || isSpeaking) return
		
		// Don't process AI queries if audio is playing
		if (isAudioPlaying) {
			console.log('🎵 AI query blocked - audio is playing');
			return;
		}
		
		setIsProcessing(true)
		setTranscript(text)
		finalTranscriptRef.current = ''
		const userMessage: ConversationMessage = { role: 'user', content: text }
		const updatedHistory = [...conversationHistory, userMessage]
		try {
			console.log('🎤 Heard:', text)
			// Reminder intent detection
			const reminderData = detectReminderFromText(text)
			if (reminderData) {
				try {
					console.log('📝 Detected reminder:', reminderData)
					await createReminder(reminderData)
					console.log('✅ Reminder created in Firestore')
					const spokenTime = reminderData.time ? formatTimeForSpeech(reminderData.time) : ''
					const confirm = reminderData.time
						? `Okay, reminder set for ${spokenTime}: ${reminderData.title}.`
						: `Okay, reminder set: ${reminderData.title}.`
					speakResponse(confirm)
				} catch (e) {
					console.error('❌ Failed to create reminder:', e)
					speakResponse('Sorry, I could not set that reminder.')
				}
				setIsProcessing(false)
				return
			}

			// Game intent detection for available games
			const detected = detectGameFromText(text)
			let pendingGame: { game: 'tictactoe' | 'trivia' | 'sudoku' | 'color' | 'audio' | 'jitsi', aiMode: boolean } | null = null
			if (detected) {
				pendingGame = { game: detected, aiMode: true }
				setPendingGameLaunch(pendingGame)
			}

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), 15000) // Increased timeout for audio generation
			const response = await fetch('/api/gemini', { 
				method: 'POST', 
				headers: { 'Content-Type': 'application/json' }, 
				body: JSON.stringify({ message: text, conversationHistory: updatedHistory, ageGroup: selectedAgeGroup }), 
				signal: controller.signal 
			})
			clearTimeout(timeoutId)
			const data = await response.json().catch(() => null)
			if (!data || !data.response) throw new Error('AI failed')
			
			const aiMessage: ConversationMessage = { role: 'assistant', content: data.response }
			setConversationHistory([...updatedHistory, aiMessage])
			
			// Check if we should use audio mode (MP3 generation)
			if (data.audioMode && hasUserInteracted) {
				console.log('🔊 Using audio mode - generating MP3 from Gemini response');
				await speakResponseWithAudio(data.response, pendingGame);
			} else {
				console.log('🔊 Using text-to-speech mode');
				speakResponse(data.response, pendingGame);
			}
		} catch (error) {
			console.error('❌ Gemini API error:', error)
			speakResponse('Sorry, I had trouble understanding that.')
		} finally {
			setIsProcessing(false)
		}
	}

	// New function for MP3 audio generation with option to open player
	const speakResponseWithAudio = async (text: string, pendingGame?: { game: 'tictactoe' | 'trivia' | 'sudoku' | 'color' | 'audio' | 'jitsi', aiMode: boolean } | null) => {
		console.log('🔊 Generating MP3 audio for:', text);
		
		setIsSpeaking(true);
		setAiResponse(text);
		
		try {
			// Generate MP3 audio from text using our audio generator
			const audioResponse = await audioGenerator.generateAudioFromText(text);
			console.log('🔊 MP3 generated successfully:', audioResponse);
			
			// Show MP3 player option instead of autoplay
			setCurrentMP3Data({
				audioUrl: audioResponse.audioUrl,
				text: text,
				duration: audioResponse.duration
			});
			setShowMP3Player(true);
			
			// Set audio playing state
			setIsAudioPlaying(true);
			
		} catch (error) {
			console.error('❌ MP3 generation failed:', error);
			// Fallback to regular speech synthesis
			speakResponse(text, pendingGame);
		}
	};
	
	// MP3 Player handlers
	const handleMP3PlayerClose = () => {
		console.log('🔊 MP3 Player closed');
		setShowMP3Player(false);
		setCurrentMP3Data(null);
		setIsSpeaking(false);
		setIsAudioPlaying(false);
		setAiResponse('');
		
		// Launch pending game if any
		if (pendingGameLaunch) {
			console.log('🎮 Launching pending game after MP3 player close:', pendingGameLaunch.game);
			launchGame(pendingGameLaunch.game, pendingGameLaunch.aiMode);
			setPendingGameLaunch(null);
		}
		
		// Restart recognition
		if (!isProcessing && canStartRecognition()) {
			console.log('🔄 Restarting recognition after MP3 player close');
			startRecognition();
		}
	};

	const handleMP3PlayerDelete = () => {
		console.log('🗑️ MP3 Player delete requested');
		
		if (currentMP3Data) {
			// Revoke the object URL to free memory
			URL.revokeObjectURL(currentMP3Data.audioUrl);
		}
		
		setShowMP3Player(false);
		setCurrentMP3Data(null);
		setIsSpeaking(false);
		setIsAudioPlaying(false);
		setAiResponse('');
		
		// Launch pending game if any
		if (pendingGameLaunch) {
			console.log('🎮 Launching pending game after MP3 delete:', pendingGameLaunch.game);
			launchGame(pendingGameLaunch.game, pendingGameLaunch.aiMode);
			setPendingGameLaunch(null);
		}
		
		// Restart recognition
		if (!isProcessing && canStartRecognition()) {
			console.log('🔄 Restarting recognition after MP3 delete');
			startRecognition();
		}
	};

	const speakResponse = (text: string, pendingGame?: { game: 'tictactoe' | 'trivia' | 'sudoku' | 'color' | 'audio' | 'jitsi', aiMode: boolean } | null) => {

		
		setIsSpeaking(true)
		setAiResponse(text)
		
		// Use the parameter if provided, otherwise use the state
		const gameToLaunch = pendingGame || pendingGameLaunch
		
		// Add an emergency fallback timer in case speech completely fails
		let emergencyLaunchTimer: NodeJS.Timeout | null = null
		if (gameToLaunch) {
			emergencyLaunchTimer = setTimeout(() => {

				if (gameToLaunch) {
					launchGame(gameToLaunch.game, gameToLaunch.aiMode)
					setPendingGameLaunch(null)
				}
				setIsSpeaking(false)
				setAiResponse('')
				if (!isProcessing && canStartRecognition()) startRecognition() // Restart recognition on emergency fallback
			}, 8000)
		}
		
		// Check if speech synthesis is available and enabled
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			if (speechPermissionGranted) {
				const synth = window.speechSynthesis

				
				// Aggressively cancel any ongoing speech
				try { 
					synth.cancel() 
					// Wait a bit for cancel to complete
					setTimeout(() => startSpeech(text, synth, gameToLaunch, emergencyLaunchTimer), 150)
				} catch (e) {

					startSpeech(text, synth, gameToLaunch, emergencyLaunchTimer)
				}
			} else {

				// Try anyway, maybe the state is wrong
				const synth = window.speechSynthesis
				try { 
					synth.cancel() 
					setTimeout(() => startSpeech(text, synth, gameToLaunch, emergencyLaunchTimer), 150)
				} catch (e) {
					console.error('Failed to start speech:', e)
					// Fall back to text display
					setTimeout(() => { 
						if (emergencyLaunchTimer) clearTimeout(emergencyLaunchTimer)
						setIsSpeaking(false) 
						setAiResponse('')
						
						// Launch pending game even if speech failed
						if (gameToLaunch) {
							console.log('🎮 Launching game after speech setup failure:', gameToLaunch.game)
							launchGame(gameToLaunch.game, gameToLaunch.aiMode)
							setPendingGameLaunch(null)
						}
						
						if (!isProcessing && canStartRecognition()) startRecognition() // Restart recognition on speech setup failure
					}, 4000)
				}
			}
		} else {
			console.warn('Speech synthesis not available, using text fallback')
			// Just show the text response without speech
			setTimeout(() => { 
				if (emergencyLaunchTimer) clearTimeout(emergencyLaunchTimer)
				setIsSpeaking(false) 
				setAiResponse('')
				
				// Launch pending game even without speech
				if (gameToLaunch) {
					console.log('🎮 Launching game without speech:', gameToLaunch.game)
					launchGame(gameToLaunch.game, gameToLaunch.aiMode)
					setPendingGameLaunch(null)
				}
				
				if (!isProcessing && canStartRecognition()) startRecognition() // Restart recognition on speech fallback
			}, 4000)
		}
	}

	// Helper function to get the best available voice
	const getBestVoice = (synth: SpeechSynthesis) => {
		// Ensure voices are loaded
		let voices = synth.getVoices()
		
		// If no voices available, try to load them
		if (voices.length === 0) {
			// Force voice loading by calling getVoices again
			voices = synth.getVoices()
			
			// If still no voices, return null
			if (voices.length === 0) {
				return null
			}
		}
		
		
		// Priority 1: Google English (US) female voice
		let preferredVoice = voices.find(voice => 
			voice.name.toLowerCase().includes('google') && 
			voice.lang.startsWith('en-US') && 
			voice.name.toLowerCase().includes('female')
		)
		
		// Priority 2: Any Google English (US) voice
		if (!preferredVoice) {
			preferredVoice = voices.find(voice => 
				voice.name.toLowerCase().includes('google') && 
				voice.lang.startsWith('en-US')
			)
		}
		
		// Priority 3: Any Google English voice
		if (!preferredVoice) {
			preferredVoice = voices.find(voice => 
				voice.name.toLowerCase().includes('google') && 
				voice.lang.startsWith('en')
			)
		}
		
		// Priority 4: Any English (US) female voice
		if (!preferredVoice) {
			preferredVoice = voices.find(voice => 
				voice.lang.startsWith('en-US') && 
				voice.name.toLowerCase().includes('female')
			)
		}
		
		// Priority 5: Any English (US) voice
		if (!preferredVoice) {
			preferredVoice = voices.find(voice => 
				voice.lang.startsWith('en-US')
			)
		}
		
		// Priority 6: Any English voice
		if (!preferredVoice) {
			preferredVoice = voices.find(voice => 
				voice.lang.startsWith('en')
			)
		}
		
		// Priority 7: Fallback to first available voice
		if (!preferredVoice) {
			preferredVoice = voices[0]
		}
		
		return preferredVoice
	}

	// Enhanced startSpeech with fallback
	const startSpeech = (text: string, synth: SpeechSynthesis, pendingGame?: { game: 'tictactoe' | 'trivia' | 'sudoku' | 'color' | 'audio' | 'jitsi', aiMode: boolean } | null, emergencyTimer?: NodeJS.Timeout | null) => {
		// If fallback audio is enabled or we're on Raspberry Pi, use fallback
		if (useFallbackAudio || navigator.userAgent.includes('Raspberry') || navigator.userAgent.includes('Linux')) {
			console.log('🔊 Using fallback audio for Raspberry Pi compatibility');
			playFallbackAudio(text);
			
			// Handle game launch after fallback audio
			if (pendingGame) {
				setTimeout(() => {
					launchGame(pendingGame.game, pendingGame.aiMode);
					setPendingGameLaunch(null);
				}, 2000);
			}
			
			// Restart recognition
			if (!isProcessing) {
				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition();
					}
				}, 2000);
			}
			return;
		}
		
		// Also check if we're on a platform that commonly has speech synthesis issues
		const hasSpeechIssues = navigator.userAgent.includes('VNC') || 
								navigator.userAgent.includes('RealVNC') ||
								navigator.userAgent.includes('TightVNC') ||
								navigator.userAgent.includes('UltraVNC') ||
								navigator.platform.includes('Linux');
		
		if (hasSpeechIssues) {
			console.log('🔊 Platform detected as having speech synthesis issues, using fallback');
			setUseFallbackAudio(true);
			playFallbackAudio(text);
			
			// Handle game launch after fallback audio
			if (pendingGame) {
				setTimeout(() => {
					launchGame(pendingGame.game, pendingGame.aiMode);
					setPendingGameLaunch(null);
				}, 2000);
			}
			
			// Restart recognition
			if (!isProcessing) {
				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition();
					}
				}, 2000);
			}
			return;
		}

		try {
			const utter = new SpeechSynthesisUtterance(text)
			utter.rate = 1.0
			utter.pitch = 1.3
			utter.volume = 1

			// Set up event handlers
			utter.onstart = () => {
				setIsSpeaking(true) // Ensure state is set
			}

			utter.onend = () => {
				if (emergencyTimer) clearTimeout(emergencyTimer)
				setIsSpeaking(false)
				setAiResponse('')
				
				// Launch pending game after speech ends
				if (pendingGame) {
					launchGame(pendingGame.game, pendingGame.aiMode)
					setPendingGameLaunch(null)
				}
				
				// Restart recognition after speech ends
				if (!isProcessing) {
					setTimeout(() => {
						if (canStartRecognition()) {
							startRecognition()
						}
					}, 1000)
				}
			}

			utter.onerror = (event) => {
				// Handle specific error types - note: TypeScript may not include all possible error types
				const errorType = event.error as string
				console.log('Speech synthesis error:', errorType);
				
				// Enable fallback audio for future attempts
				setUseFallbackAudio(true);
				
				if (errorType === 'not-allowed' || errorType === 'authorization-failed') {
					setSpeechPermissionGranted(false)
					
					// Fall back to text display without speech
					if (emergencyTimer) clearTimeout(emergencyTimer)
					setIsSpeaking(false)
					setAiResponse(text)
					setTimeout(() => {
						setAiResponse('')
						
						// Launch pending game even if speech failed
						if (pendingGame) {
							launchGame(pendingGame.game, pendingGame.aiMode)
							setPendingGameLaunch(null)
						}
						
						if (!isProcessing) {
							setTimeout(() => {
								if (canStartRecognition()) {
									startRecognition()
								}
							}, 2000)
						}
					}, 4000)
					return
				}
				
				if (errorType === 'interrupted' || errorType === 'canceled') {
					if (emergencyTimer) clearTimeout(emergencyTimer)
					setIsSpeaking(false)
					setAiResponse('')
					
					// Launch pending game even if speech was interrupted
					if (pendingGame) {
						launchGame(pendingGame.game, pendingGame.aiMode)
						setPendingGameLaunch(null)
					}
					
					if (!isProcessing) {
						setTimeout(() => {
							if (canStartRecognition()) {
								startRecognition()
							}
						}, 1000)
					}
					return
				}
				
				// For other errors, try fallback audio
				if (emergencyTimer) clearTimeout(emergencyTimer)
				setIsSpeaking(false)
				playFallbackAudio(text);
				
				// Launch pending game after fallback audio
				if (pendingGame) {
					setTimeout(() => {
						launchGame(pendingGame.game, pendingGame.aiMode)
						setPendingGameLaunch(null)
					}, 2000)
				}
				
				// Restart recognition
				if (!isProcessing) {
					setTimeout(() => {
						if (canStartRecognition()) {
							startRecognition()
						}
					}, 2000)
				}
			}

			// Try to speak
			synth.speak(utter)
			
		} catch (error) {
			console.error('Speech synthesis failed:', error)
			// Enable fallback audio
			setUseFallbackAudio(true)
			playFallbackAudio(text)
			
			// Handle game launch and recognition restart
			if (pendingGame) {
				setTimeout(() => {
					launchGame(pendingGame.game, pendingGame.aiMode)
					setPendingGameLaunch(null)
				}, 2000)
			}
			
			if (!isProcessing) {
				setTimeout(() => {
					if (canStartRecognition()) {
						startRecognition()
					}
				}, 2000)
			}
		}
	}

	const Mouth = () => {
		if (isSpeaking) {
			const baseRadius = 25
			const r = baseRadius + Math.sin(mouthAnimation * 6) * 15
			return (<circle cx="600" cy="500" r={r} fill="none" stroke="#08AFC0" strokeWidth="8" opacity={0.8 + Math.sin(mouthAnimation * 4) * 0.2} />)
		}
		return (<line x1="580" y1="500" x2="620" y2="500" stroke="#08AFC0" strokeWidth="6" strokeLinecap="round" />)
	}

	// System recovery mechanism - handles unexpected crashes and restores functionality
	useEffect(() => {
		const systemRecovery = setInterval(() => {
			try {
				// Check if recognition is in a bad state
				if (recognitionRef.current && 
					!isListening && 
					!isSpeaking && 
					!isProcessing && 
					!isStartingRef.current && 
					!isStoppingRef.current &&
					shouldListenRef.current) {
					
					// Check if recognition has been inactive for too long (potential crash)
					const timeSinceLastRestart = Date.now() - lastRestartAttemptRef.current;
					if (timeSinceLastRestart > 30000) { // 30 seconds
						console.log('🔄 System recovery: recognition appears crashed, attempting recovery');
						
						// Reset all flags and try to restart
						isStartingRef.current = false;
						isStoppingRef.current = false;
						lastRestartAttemptRef.current = Date.now();
						
						setTimeout(() => {
							if (canStartRecognition()) {
								console.log('🔄 System recovery: restarting recognition');
								startRecognition();
							}
						}, 2000);
					}
				}
				
				// Check if audio context is in a bad state
				if (fallbackAudioContext && fallbackAudioContext.state === 'suspended') {
					console.log('🔊 System recovery: audio context suspended, attempting resume');
					fallbackAudioContext.resume().catch(e => {
						console.error('🔊 System recovery: failed to resume audio context:', e);
					});
				}
				
			} catch (error) {
				console.error('🔄 System recovery error:', error);
				// Don't crash the recovery system
			}
		}, 10000); // Check every 10 seconds

		return () => clearInterval(systemRecovery);
	}, [isListening, isSpeaking, isProcessing, fallbackAudioContext]);

	return (
		<>
			{!speechPermissionGranted && (
				<div className="modal-backdrop">
					<div className="permission-modal">
						<h2>Enable Microphone</h2>
						<p>This app uses your microphone to enable voice commands.</p>
						<button className="btn" onClick={requestSpeechPermission}>Enable Microphone</button>
					</div>
				</div>
			)}
			{!selectedAgeGroup && (
				<div className="modal-backdrop">
					<div className="permission-modal">
						<h2>Welcome to OneRobo!</h2>
						<p>Please select your age group so I can provide the best experience for you:</p>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
							<button 
								className="btn" 
								onClick={() => {
									createAudioContextOnInteraction();
									setSelectedAgeGroup('CHILD')
									saveAgeGroup('CHILD')
								}}
								style={{ fontSize: '16px', padding: '12px 20px' }}
							>
								CHILD (Ages 3-12)
							</button>
							<button 
								className="btn" 
								onClick={() => {
									createAudioContextOnInteraction();
									setSelectedAgeGroup('TEEN-ADULT')
									saveAgeGroup('TEEN-ADULT')
								}}
								style={{ fontSize: '16px', padding: '12px 20px' }}
							>
								TEEN-ADULT (Ages 13-64)
							</button>
							<button 
								className="btn" 
								onClick={() => {
									createAudioContextOnInteraction();
									setSelectedAgeGroup('OLD')
									saveAgeGroup('OLD')
								}}
								style={{ fontSize: '16px', padding: '12px 20px' }}
							>
								OLD (Ages 65+)
							</button>
						</div>
					</div>
				</div>
			)}
			{selectedAgeGroup && (
				<>
					{!hasUserInteracted && (
						<div className="modal-backdrop">
							<div className="permission-modal">
								<h2>🎵 Audio Setup</h2>
								<p>For the best experience on all devices (including Raspberry Pi), please interact with the page to enable audio capabilities.</p>
								<p style={{ fontSize: '14px', opacity: 0.8, marginTop: '10px' }}>
									💡 <strong>Tip:</strong> Click anywhere on the page or press any key to continue
								</p>
								<button 
									className="btn" 
									onClick={() => setHasUserInteracted(true)}
									style={{ fontSize: '16px', padding: '12px 20px', marginTop: '20px' }}
								>
									✅ I Understand
								</button>
							</div>
						</div>
					)}
					<div className="header-actions" />
					<main className="container">
						<div className="interface">
							<svg className="face" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
								<defs>
									<radialGradient id="galaxy-bg" cx="50%" cy="50%" r="50%">
										<stop offset="0%" stopColor="#2c003e" />
										<stop offset="100%" stopColor="#000000" />
									</radialGradient>
									<radialGradient id="eye-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
										<stop offset="0%" style={{ stopColor: 'rgb(0, 255, 127)', stopOpacity: 1 }} />
										<stop offset="100%" style={{ stopColor: 'rgb(0, 128, 0)', stopOpacity: 1 }} />
									</radialGradient>
									<filter id="blush-blur">
										<feGaussianBlur in="SourceGraphic" stdDeviation="10" />
									</filter>
								</defs>
								<rect width="1200" height="700" fill="url(#galaxy-bg)" />
								{stars.map((star, i) => (
									<circle key={i} cx={star.cx} cy={star.cy} r={star.r} fill="white" opacity={star.opacity} />
								))}
								<g>
									{/* Cheeks */}
									<ellipse cx="380" cy="450" rx="60" ry="25" fill="rgba(255, 105, 180, 0.4)" filter="url(#blush-blur)" />
									<ellipse cx="820" cy="450" rx="60" ry="25" fill="rgba(255, 105, 180, 0.4)" filter="url(#blush-blur)" />

									{/* Eyes */}
									<g className="blinking-eyes">
										<circle cx="400" cy="350" r="80" fill="url(#eye-gradient)" />
										<circle cx="400" cy="350" r="40" fill="#000" />
										<circle cx="420" cy="320" r="18" fill="#fff" />
										<circle cx="380" cy="380" r="9" fill="#fff" opacity="0.7" />
									</g>
									<g className="blinking-eyes">
										<circle cx="800" cy="350" r="80" fill="url(#eye-gradient)" />
										<circle cx="800" cy="350" r="40" fill="#000" />
										<circle cx="820" cy="320" r="18" fill="#fff" />
										<circle cx="780" cy="380" r="9" fill="#fff" opacity="0.7" />
									</g>

									{/* Mouth */}
									<path
										className={isSpeaking ? 'speaking-mouth' : ''}
										d="M520 550 Q600 600 680 550"
										stroke="#08AFC0"
										strokeWidth="8"
										fill="none"
										strokeLinecap="round"
									/>
								</g>
							</svg>
							{(aiResponse || transcript) && (
								<div className="subtitle">{aiResponse ? aiResponse : transcript}</div>
							)}
							{isProcessing && (
								<div className="processing"><div className="thinking-dots"><span>.</span><span>.</span><span>.</span></div>AI is thinking...</div>
							)}
							<div className="mic-status">
								{isSpeaking ? 'Speaking…' : (isProcessing ? 'Listening paused' : (isListening ? 'Listening…' : 'Microphone Idle'))}
							</div>

							{/* Audio Playing Status */}
							{isAudioPlaying && (
								<div className="audio-status" style={{ 
									position: 'absolute', 
									top: '20px', 
									right: '20px',
									padding: '8px 16px',
									backgroundColor: '#10B981',
									color: 'white',
									borderRadius: '20px',
									fontSize: '14px',
									fontWeight: 'bold',
									boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
									zIndex: 1000
								}}>
									Audio Playing - AI Paused
								</div>
							)}

							{/* Fallback Audio Status */}
							{useFallbackAudio && (
								<div className="fallback-audio-status" style={{ 
									position: 'absolute', 
									top: '60px', 
									right: '20px',
									padding: '8px 16px',
									backgroundColor: '#F59E0B',
									color: 'white',
									borderRadius: '20px',
									fontSize: '12px',
									fontWeight: 'bold',
									boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
									zIndex: 1000,
									animation: 'userInteractionPulse 2s infinite'
								}}>
									🔊 Fallback Audio Mode (Pi Compatible)
									<br />
									<small>Speech synthesis disabled</small>
								</div>
							)}

							{/* User Interaction Status */}
							{!hasUserInteracted && (
								<div className="user-interaction-status" style={{ 
									position: 'absolute', 
									top: '100px', 
									right: '20px',
									padding: '8px 16px',
									backgroundColor: '#EF4444',
									color: 'white',
									borderRadius: '20px',
									fontSize: '12px',
									fontWeight: 'bold',
									boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
									zIndex: '1000',
									animation: 'userInteractionPulse 2s infinite'
								}}>
									👆 Click to Enable Audio
								</div>
							)}

							{/* MP3 Available Status */}
							{showMP3Player && currentMP3Data && (
								<div className="mp3-available-status" style={{ 
									position: 'absolute', 
									top: '140px', 
									right: '20px',
									padding: '8px 16px',
									backgroundColor: '#10B981',
									color: 'white',
									borderRadius: '20px',
									fontSize: '12px',
									fontWeight: 'bold',
									boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
									zIndex: '1000',
									animation: 'userInteractionPulse 2s infinite'
								}}>
									🎵 MP3 Player Open
								</div>
							)}

							{/* Age Group Indicator and Change Button */}
							<div style={{ 
								position: 'absolute', 
								top: '20px', 
								left: '20px',
								display: 'flex',
								alignItems: 'center',
								gap: '10px'
							}}>
								<div style={{ fontSize: '10px', color: 'rgba(8, 175, 192, 0.7)', marginBottom: '4px' }}>
									Preference saved locally
								</div>
							</div>
							<div style={{ 
								position: 'absolute', 
								top: '40px', 
								left: '20px',
								display: 'flex',
								alignItems: 'center',
								gap: '10px'
							}}>
								<div style={{
									padding: '6px 12px',
									backgroundColor: 'rgba(8, 175, 192, 0.2)',
									color: '#08AFC0',
									borderRadius: '15px',
									fontSize: '12px',
									fontWeight: 'bold',
									border: '1px solid rgba(8, 175, 192, 0.3)'
								}}>
									{selectedAgeGroup}
								</div>
								<button
									onClick={() => {
										setSelectedAgeGroup(null)
										saveAgeGroup(null)
									}}
									style={{
										padding: '4px 8px',
										backgroundColor: 'rgba(255, 255, 255, 0.1)',
										color: '#08AFC0',
										border: '1px solid rgba(8, 175, 192, 0.3)',
										borderRadius: '8px',
										fontSize: '10px',
										cursor: 'pointer',
										transition: 'all 0.2s ease'
									}}
									onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(8, 175, 192, 0.2)'}
									onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
								>
									Change
								</button>
							</div>

							{/* Manual AudioPlayer Button for Testing */}
							<div className="manual-controls" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
								<div style={{ display: 'flex', gap: '10px' }}>
									<button
										onClick={() => setShowAudioPlayer(true)}
										style={{
											padding: '10px 20px',
											backgroundColor: '#08AFC0',
											color: 'white',
											border: 'none',
											borderRadius: '25px',
											fontSize: '14px',
											cursor: 'pointer',
											boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
										}}
										onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0699A8'}
										onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#08AFC0'}
									>
										Open Audio Player
									</button>
									<button
										onClick={() => setShowJitsiMeet(true)}
										style={{
											padding: '10px 20px',
											backgroundColor: '#10B981',
											color: 'white',
											border: 'none',
											borderRadius: '25px',
											fontSize: '14px',
											cursor: 'pointer',
											boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
										}}
										onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
										onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
									>
										Open Jitsi Meet
									</button>
									<a
										href="/audio-test"
										style={{
											padding: '10px 20px',
											backgroundColor: '#F59E0B',
											color: 'white',
											border: 'none',
											borderRadius: '25px',
											fontSize: '14px',
											cursor: 'pointer',
											boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
											textDecoration: 'none',
											display: 'inline-block'
										}}
										onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
										onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
									>
										🔊 Audio Test
									</a>
									<button
										onClick={() => {
											console.log('🔊 Testing fallback audio system...');
											playFallbackAudio('This is a test of the fallback audio system. If you can hear this, the system is working correctly.');
										}}
										style={{
											padding: '10px 20px',
											backgroundColor: '#8B5CF6',
											color: 'white',
											border: 'none',
											borderRadius: '25px',
											fontSize: '14px',
											cursor: 'pointer',
											boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
										}}
										onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7C3AED'}
										onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B5CF6'}
									>
										🎵 Test Fallback
									</button>
								</div>
							</div>
						</div>
					</main>
				</>
			)}
			
			{/* Games and other components - available regardless of age group */}
			{showTicTacToe && <TicTacToe onClose={() => {
				setShowTicTacToe(false);
				setPendingGameLaunch(null);
				setTranscript('');
				finalTranscriptRef.current = '';
			}} aiMode={ticTacToeAiMode} onGameEnd={ticTacToeAiMode ? handleGameEnd : undefined} />}
			{showTrivia && <Trivia onClose={() => {
				setShowTrivia(false);
				setPendingGameLaunch(null);
				setTranscript('');
				finalTranscriptRef.current = '';
			}} />}
			{showSudoku && <Sudoku onClose={() => {
				setShowSudoku(false);
				setPendingGameLaunch(null);
				setTranscript('');
				finalTranscriptRef.current = '';
			}} />}
			{showColorGame && <ColorDetectionGame onClose={() => {
				setShowColorGame(false);
				setPendingGameLaunch(null);
				setTranscript('');
				finalTranscriptRef.current = '';
			}} />}
			<AudioPlayer onClose={() => {
				console.log('AudioPlayer close requested but keeping it open for continuous monitoring');
			}} onAudioStateChange={handleAudioStateChange} />
			{showJitsiMeet && (
				<JitsiMeet onClose={() => {
					setShowJitsiMeet(false);
					setPendingGameLaunch(null);
					setTranscript('');
					finalTranscriptRef.current = '';
				}} />
			)}
			
			{/* MP3 Player Modal */}
			{showMP3Player && currentMP3Data && (
				<MP3Player
					audioUrl={currentMP3Data.audioUrl}
					text={currentMP3Data.text}
					duration={currentMP3Data.duration}
					onClose={handleMP3PlayerClose}
					onDelete={handleMP3PlayerDelete}
				/>
			)}
		</>
	)
}

