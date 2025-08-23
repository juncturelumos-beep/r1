import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
	try {
		const { message, conversationHistory = [], ageGroup = 'CHILD' } = await request.json()
		if (!message) {
			return NextResponse.json({ error: 'Message is required' }, { status: 400 })
		}

		const API_KEY = 'AIzaSyCu7pp0aiP3CluOLpvWsxmNKngabxEGALY'
		// Build instruction context from local file
		let instructions = 'You are a friendly AI robot assistant named Antara who looks after little children,elderly people and teens who were left at home by their working parents. Keep responses under 30 words.'
		try {
			const instructionsPath = join(process.cwd(), 'chatbot-instructions.txt')
			instructions = readFileSync(instructionsPath, 'utf-8').trim()
		} catch (error) {
			console.log('Could not read instructions file, using default')
		}

		// Add age-specific instructions
		let ageSpecificInstructions = ''
		switch (ageGroup) {
			case 'CHILD':
				ageSpecificInstructions = ' You are talking to a CHILD (ages 3-12). Use simple, friendly language. Be very patient and encouraging. Use lots of emojis and fun expressions. Keep explanations very simple and engaging. Focus on games, fun activities, and making them feel safe and happy.'
				break
			case 'TEEN-ADULT':
				ageSpecificInstructions = ' You are talking to a TEEN-ADULT (ages 13-64). Use clear, friendly language. Be helpful and informative. You can discuss more complex topics, provide useful information, and engage in meaningful conversations. Be respectful and professional while maintaining a warm personality.'
				break
			case 'OLD':
				ageSpecificInstructions = ' You are talking to an OLD person (ages 65+). Use clear, respectful language. Speak a bit slower and be very patient. Show respect for their life experience. Be helpful with practical matters and show genuine care and concern. Use a warm, comforting tone. Also u should listen more and let them speak more'
				break
			default:
				ageSpecificInstructions = ' You are talking to a CHILD (ages 3-12). Use simple, friendly language. Be very patient and encouraging. Use lots of emojis and fun expressions. Keep explanations very simple and engaging. Focus on games, fun activities, and making them feel safe and happy.'
		}

		instructions += ageSpecificInstructions

		let conversationContext = instructions
		if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
			conversationContext += '\n\nCONVERSATION HISTORY:\n'
			for (const msg of conversationHistory) {
				const role = msg.role === 'user' ? 'CHILD' : 'ANTARA'
				conversationContext += `${role}: ${msg.content}\n`
			}
		}
		conversationContext += `\nCHILD: "${message}"\n\nANTARA, respond as yourself in 1-3 sentences.`

		if (!API_KEY) {
			// Simple local echo if no key
			return NextResponse.json({ response: 'I heard you. Let\'s play a game or chat!' })
		}

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 15000) // Increased timeout for audio generation

		// First, get text response from Gemini
		const textResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					contents: [{ parts: [{ text: conversationContext }] }], 
					generationConfig: { temperature: 0.7, maxOutputTokens: 200 } 
				}),
				signal: controller.signal
			}
		)
		
		if (!textResp.ok) {
			clearTimeout(timeoutId)
			console.error('Gemini text API error:', await textResp.text())
			return NextResponse.json({ response: "Sorry, I'm having trouble right now." })
		}

		const textData = await textResp.json()
		const aiTextResponse = textData?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I didn't understand that."

		// Now generate audio using Gemini's audio generation capabilities
		try {
			// Use Gemini's text-to-speech or audio generation endpoint
			// Note: Gemini doesn't have direct audio generation, so we'll use a fallback approach
			// For now, return both text and a flag indicating audio should be generated client-side
			
			clearTimeout(timeoutId)
			
			return NextResponse.json({ 
				response: aiTextResponse,
				audioMode: true, // Flag to indicate client should handle audio
				message: 'Audio will be generated client-side for better Pi compatibility'
			})
			
		} catch (audioError) {
			console.error('Audio generation error:', audioError)
			// Fallback to text-only if audio generation fails
			clearTimeout(timeoutId)
			return NextResponse.json({ 
				response: aiTextResponse,
				audioMode: false
			})
		}
		
	} catch (e) {
		console.error('Error calling Gemini API:', e)
		let errorMessage = "Sorry, I couldn't process that."
		if (e instanceof Error) {
			if (e.name === 'AbortError') {
				errorMessage = "Sorry, that took too long. Please try again!"
			}
		}
		return NextResponse.json({ response: errorMessage, audioMode: false })
	}
}

