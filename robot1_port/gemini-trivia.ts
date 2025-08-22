import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { age, subject, difficulty } = await request.json()
		const numAge = Number(age) || 12
		const subj = String(subject || 'general')

		if (numAge <= 6) {
			const qs = normalizeQuestions(generateKidQuestions(numAge, subj))
			return NextResponse.json({ questions: qs })
		}

		if (numAge <= 9 && isMathSubject(subj)) {
			const qs = normalizeQuestions(generateJuniorMathQuestions())
			return NextResponse.json({ questions: qs })
		}

		const GEMINI_API_KEY = process.env.GEMINI_API_KEY

		if (!GEMINI_API_KEY) {
			return fetchOpenTdbResponse(numAge, subj, difficulty)
		}

		const prompt = `Generate 10 trivia questions about ${subj} that are appropriate for a ${numAge}-year-old person.\nThe difficulty should be ${difficulty}.\nEach question should have 4 multiple choice answers with only 1 correct answer.\nFormat the response as a JSON array with this structure:\n[\n  {\n    "question": "Question text here?",\n    "correct_answer": "Correct answer here",\n    "incorrect_answers": ["Wrong answer 1", "Wrong answer 2", "Wrong answer 3"]\n  }\n]\nMake sure the questions are engaging, educational, and age-appropriate.`

		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
			}
		)

		if (!response.ok) {
			return fetchOpenTdbResponse(numAge, subj, difficulty)
		}

		const data = await response.json()
		const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
		const jsonMatch = generatedText?.match(/\[[\s\S]*\]/)
		if (jsonMatch) {
			try {
				let questions = JSON.parse(jsonMatch[0])
				if (Array.isArray(questions) && questions.length > 0) {
					questions = normalizeQuestions(questions)
					return NextResponse.json({ questions })
				}
			} catch {}
		}

		return fetchOpenTdbResponse(numAge, subj, difficulty)
	} catch (error) {
		console.error('Error generating trivia:', error)
		return fetchOpenTdbResponse(12, 'general', 'easy')
	}
}

function isMathSubject(subjectRaw: string) {
	const s = (subjectRaw || '').toLowerCase()
	return s.includes('math') || s.includes('mathematic')
}

function subjectToCategoryId(subjectRaw: string): number {
	const subject = (subjectRaw || '').toLowerCase()
	const map: Record<string, number> = {
		'general': 9,
		'general knowledge': 9,
		'books': 10,
		'literature': 10,
		'english': 10,
		'film': 11,
		'movies': 11,
		'music': 12,
		'television': 14,
		'tv': 14,
		'video games': 15,
		'games': 15,
		'science': 17,
		'nature': 17,
		'space': 17,
		'animals': 27,
		'computers': 18,
		'technology': 18,
		'maths': 19,
		'math': 19,
		'mathematics': 19,
		'mythology': 20,
		'sports': 21,
		'geography': 22,
		'history': 23,
		'politics': 24,
		'art': 25,
		'vehicles': 28,
		'comics': 29,
		'gadgets': 30,
		'cartoons': 32,
		'animation': 32,
	}
	if (map[subject] !== undefined) return map[subject]
	const key = Object.keys(map).find(k => subject.includes(k))
	return key ? map[key] : 9
}

function difficultyFromAge(age: number, preferred?: string): 'easy' | 'medium' | 'hard' {
	if (preferred === 'easy' || preferred === 'medium' || preferred === 'hard') return preferred
	if (age <= 10) return 'easy'
	if (age <= 16) return 'medium'
	return 'hard'
}

function decodeHtml(text: string): string {
	return (text || '')
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&eacute;/g, 'é')
		.replace(/&uuml;/g, 'ü')
		.replace(/&ouml;/g, 'ö')
		.replace(/&auml;/g, 'ä')
}

async function fetchOpenTdbResponse(age: number, subject: string, preferredDifficulty?: string) {
	try {
		const categoryId = subjectToCategoryId(subject)
		const diff = difficultyFromAge(Number(age) || 12, preferredDifficulty)
		const url = `https://opentdb.com/api.php?amount=10&category=${categoryId}&difficulty=${diff}&type=multiple`
		const res = await fetch(url)
		const data = await res.json()
		if (data.response_code !== 0 || !Array.isArray(data.results)) {
			throw new Error('OpenTDB failed')
		}
		let questions = data.results.map((q: any) => ({
			question: decodeHtml(q.question),
			correct_answer: decodeHtml(q.correct_answer),
			incorrect_answers: q.incorrect_answers.map((a: string) => decodeHtml(a))
		}))

		if ((Number(age) || 12) <= 9) {
			questions = filterKidFriendlyQuestions(questions, subject)
		}
		questions = normalizeQuestions(questions)
		return NextResponse.json({ questions })
	} catch (e) {
		const questions = normalizeQuestions(generateFallbackQuestions(Number(age) || 12, subject || 'general', preferredDifficulty || 'easy'))
		return NextResponse.json({ questions })
	}
}

function filterKidFriendlyQuestions(questions: Array<{ question: string; correct_answer: string; incorrect_answers: string[] }>, subject: string) {
	const banned = [/periodic/i, /element/i, /atomic/i, /quantum/i, /derivative/i, /integral/i, /calculus/i, /enzyme/i, /molecule/i, /politic/i]
	const mathKeep = [/add/i, /plus/i, /sum/i, /subtract/i, /minus/i, /difference/i, /times/i, /multiply/i, /product/i, /half/i, /double/i, /even/i, /odd/i, /count/i, /number/i]
	const isMath = isMathSubject(subject)
	let filtered = questions.filter(q => typeof q?.question === 'string' && !banned.some(rx => rx.test(q.question)))
	if (isMath) {
		filtered = filtered.filter(q => mathKeep.some(rx => rx.test(q.question)))
	}
	return filtered.slice(0, 10)
}

function normalizeQuestions(input: any[]): Array<{ question: string; correct_answer: string; incorrect_answers: string[] }> {
	const result: Array<{ question: string; correct_answer: string; incorrect_answers: string[] }> = []
	for (const item of input || []) {
		if (!item) continue
		const q = String(item.question ?? 'Question?')
		const ca = String(item.correct_answer ?? 'Correct')
		let ia = Array.isArray(item.incorrect_answers) ? item.incorrect_answers.map((x: any) => String(x)) : []
		const pool = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F', 'Option G']
		while (ia.length < 3) {
			const candidate = pool[Math.floor(Math.random() * pool.length)]
			if (candidate !== ca && !ia.includes(candidate)) ia.push(candidate)
		}
		result.push({ question: q, correct_answer: ca, incorrect_answers: ia.slice(0, 3) })
		if (result.length >= 10) break
	}
	// Only add fallback questions if we have less than 5 valid questions
	// and only add appropriate fallback questions, not always math
	return result
}

function generateFallbackQuestions(age: number, subject: string, difficulty: string) {
	const questions: Array<{ question: string; correct_answer: string; incorrect_answers: string[] }> = []
	
	// Generate appropriate fallback questions based on subject
	if (isMathSubject(subject)) {
		return generateJuniorMathQuestions()
	}
	
	// General knowledge fallback questions for kids/adults
	const generalQuestions = [
		{
			question: "What is the largest planet in our solar system?",
			correct_answer: "Jupiter",
			incorrect_answers: ["Saturn", "Mars", "Earth"]
		},
		{
			question: "Which animal is known as the King of the Jungle?",
			correct_answer: "Lion",
			incorrect_answers: ["Tiger", "Elephant", "Bear"]
		},
		{
			question: "How many days are there in a year?",
			correct_answer: "365",
			incorrect_answers: ["360", "364", "366"]
		},
		{
			question: "What color do you get when you mix red and yellow?",
			correct_answer: "Orange",
			incorrect_answers: ["Purple", "Green", "Pink"]
		},
		{
			question: "Which season comes after winter?",
			correct_answer: "Spring",
			incorrect_answers: ["Summer", "Fall", "Autumn"]
		}
	]
	
	return generalQuestions.slice(0, 10)
}

function generateKidQuestions(age: number, subjectRaw: string) {
	const subject = (subjectRaw || '').toLowerCase()
	if (isMathSubject(subject)) {
		return generateKidMathQuestions()
	}
	return generateKidGeneralQuestions()
}

function pick<T>(arr: T[], n: number): T[] {
	const copy = [...arr]
	const out: T[] = []
	while (out.length < n && copy.length) {
		out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
	}
	return out
}

function generateJuniorMathQuestions() {
	const qs: Array<{ question: string; correct_answer: string; incorrect_answers: string[] }> = []
	for (let i = 0; i < 10; i++) {
		const mode = Math.random()
		let a = Math.floor(Math.random() * 11)
		let b = Math.floor(Math.random() * 11)
		let correct = 0
		let question = ''
		if (mode < 0.5) {
			if (Math.random() < 0.7) {
				correct = a + b
				question = `What is ${a} + ${b}?`
			} else {
				if (b > a) [a, b] = [b, a]
				correct = a - b
				question = `What is ${a} - ${b}?`
			}
		} else {
			a = Math.floor(Math.random() * 6)
			b = Math.floor(Math.random() * 6)
			correct = a * b
			question = `What is ${a} × ${b}?`
		}
		const wrongs = new Set<number>()
		while (wrongs.size < 3) {
			const delta = Math.random() < 0.5 ? -1 : 1
			const val = Math.max(0, correct + delta * (1 + Math.floor(Math.random() * 3)))
			if (val !== correct && val <= 30) wrongs.add(val)
		}
		qs.push({ question, correct_answer: String(correct), incorrect_answers: Array.from(wrongs).map(String) })
	}
	return qs
}

function generateKidMathQuestions() {
	const questions: Array<{ question: string; correct_answer: string; incorrect_answers: string[] }> = []
	for (let i = 0; i < 10; i++) {
		const isAdd = Math.random() < 0.7
		let a = Math.floor(Math.random() * 6)
		let b = Math.floor(Math.random() * 6)
		if (!isAdd) {
			if (b > a) [a, b] = [b, a]
		}
		const correct = isAdd ? a + b : a - b
		const question = isAdd ? `What is ${a} + ${b}?` : `What is ${a} - ${b}?`
		const wrongs = new Set<number>()
		while (wrongs.size < 3) {
			const delta = Math.random() < 0.5 ? -1 : 1
			const val = Math.max(0, correct + delta * (1 + Math.floor(Math.random() * 2)))
			if (val !== correct && val <= 10) wrongs.add(val)
		}
		questions.push({ question, correct_answer: String(correct), incorrect_answers: Array.from(wrongs).map(String) })
	}
	return questions
}

function generateKidGeneralQuestions() {
	const colors = ['Red', 'Blue', 'Green', 'Yellow']
	const shapes = ['Circle', 'Square', 'Triangle', 'Star']
	const base: Array<{ question: string; correct_answer: string; incorrect_answers: string[] }> = []
	base.push({ question: 'Which one is a color?', correct_answer: colors[0], incorrect_answers: ['Dog', 'Car', 'House'] })
	base.push({ question: 'Which one is a shape?', correct_answer: shapes[0], incorrect_answers: ['Apple', 'Cat', 'Shoe'] })
	base.push({ question: 'How many is 1 + 1?', correct_answer: '2', incorrect_answers: ['1', '3', '4'] })
	base.push({ question: 'Which number is bigger?', correct_answer: '3', incorrect_answers: ['1', '0', '2'] })
	base.push({ question: 'Which one is a color?', correct_answer: colors[1], incorrect_answers: ['Tree', 'Phone', 'Book'] })
	base.push({ question: 'Which one is a shape?', correct_answer: shapes[1], incorrect_answers: ['Ball', 'Dog', 'Cake'] })
	base.push({ question: 'How many is 2 + 1?', correct_answer: '3', incorrect_answers: ['1', '2', '4'] })
	base.push({ question: 'Which number is smaller?', correct_answer: '1', incorrect_answers: ['2', '3', '4'] })
	base.push({ question: 'Find the color: Blue', correct_answer: 'Blue', incorrect_answers: ['Cat', 'Shoe', 'Car'] })
	base.push({ question: 'Find the shape: Star', correct_answer: 'Star', incorrect_answers: ['Car', 'Apple', 'Tree'] })
	return base.slice(0, 10)
}


