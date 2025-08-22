export type RepeatMode = 'once' | 'today' | 'daily' | 'weekly'

export interface Reminder {
  id: string
  title: string
  time?: string // HH:mm (24h)
  repeatMode: RepeatMode
  completed: boolean
  createdAt: Date
  userId?: string
}

export interface ReminderFormData {
  title: string
  time?: string
  repeatMode: RepeatMode
}


