import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query as buildQuery, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore'
import { db } from './config'
import { Reminder, ReminderFormData } from '../types/reminder'

const COLLECTION_NAME = 'reminders'

// Helper function to check if a reminder is from a previous day
const isFromPreviousDay = (createdAt: Date): boolean => {
  const today = new Date()
  const reminderDate = new Date(createdAt)
  return (
    reminderDate.getDate() !== today.getDate() ||
    reminderDate.getMonth() !== today.getMonth() ||
    reminderDate.getFullYear() !== today.getFullYear()
  )
}

// Helper function to check if reminder time has passed
const hasTimePassed = (time: any): boolean => {
  if (!time || typeof time !== 'string') return false
  try {
    const now = new Date()
    const [hours, minutes] = time.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return false
    const reminderTime = new Date()
    reminderTime.setHours(hours, minutes, 0, 0)
    return now > reminderTime
  } catch (error) {
    console.error('Error checking if time has passed:', time, error)
    return false
  }
}

// Clean up old "today" reminders and mark past time reminders as completed
export const cleanupReminders = async (): Promise<void> => {
  try {
    const batch = writeBatch(db)
    const remindersRef = collection(db, COLLECTION_NAME)
    const querySnapshot = await getDocs(remindersRef)
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as any
      const reminderRef = doc(db, COLLECTION_NAME, docSnapshot.id)
      if (data.repeatMode === 'today' && data.createdAt && isFromPreviousDay(data.createdAt.toDate?.() || data.createdAt)) {
        batch.delete(reminderRef)
      }
      if (!data.completed && hasTimePassed(data.time)) {
        batch.update(reminderRef, { completed: true })
      }
    })
    await batch.commit()
  } catch (error) {
    console.error('Error cleaning up reminders:', error)
    throw error
  }
}

// Create a new reminder
export const createReminder = async (reminderData: ReminderFormData, userId?: string): Promise<string> => {
  try {
    const reminderDataToSave: any = {
      title: reminderData.title,
      time: reminderData.time,
      repeatMode: reminderData.repeatMode,
      completed: false,
      createdAt: new Date(),
    }
    if (userId) {
      reminderDataToSave.userId = userId
    }
    const docRef = await addDoc(collection(db, COLLECTION_NAME), reminderDataToSave)
    return docRef.id
  } catch (error) {
    console.error('Error creating reminder:', error)
    throw error
  }
}

// Get all reminders for a user
export const getReminders = async (userId?: string): Promise<Reminder[]> => {
  try {
    await cleanupReminders()
    let q: any = collection(db, COLLECTION_NAME)
    if (userId) {
      q = buildQuery(q, where('userId', '==', userId))
    }
    q = buildQuery(q, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    const reminders: Reminder[] = []
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as any
      reminders.push({
        id: docSnapshot.id,
        title: data.title,
        time: data.time,
        repeatMode: data.repeatMode,
        completed: data.completed,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        userId: data.userId || undefined,
      })
    })
    return reminders
  } catch (error) {
    console.error('Error getting reminders:', error)
    throw error
  }
}

// Update a reminder
export const updateReminder = async (id: string, updates: Partial<Reminder>): Promise<void> => {
  try {
    const cleanUpdates: any = {}
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) cleanUpdates[key] = value
    })
    const reminderRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(reminderRef, cleanUpdates)
  } catch (error) {
    console.error('Error updating reminder:', error)
    throw error
  }
}

// Delete a reminder
export const deleteReminder = async (id: string): Promise<void> => {
  try {
    const reminderRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(reminderRef)
  } catch (error) {
    console.error('Error deleting reminder:', error)
    throw error
  }
}

// Toggle complete
export const toggleReminderComplete = async (id: string, completed: boolean): Promise<void> => {
  try {
    await updateReminder(id, { completed })
  } catch (error) {
    console.error('Error toggling reminder completion:', error)
    throw error
  }
}

// Get reminders for today that have time <= now and not completed
export const getDueRemindersForToday = async (userId?: string): Promise<Reminder[]> => {
  try {
    const qBase: any = collection(db, COLLECTION_NAME)
    let q = qBase
    if (userId) {
      q = buildQuery(q, where('userId', '==', userId))
    }
    q = buildQuery(q, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    const now = new Date()
    const todayY = now.getFullYear(), todayM = now.getMonth(), todayD = now.getDate()
    const toMinutes = (t?: string) => {
      if (!t) return Number.POSITIVE_INFINITY
      const [hh, mm] = t.split(':').map(Number)
      return (hh || 0) * 60 + (mm || 0)
    }
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const results: Reminder[] = []
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as any
      if (data.completed) return
      const created = data.createdAt?.toDate?.() || data.createdAt
      const createdDate = new Date(created)
      if (
        createdDate.getFullYear() === todayY &&
        createdDate.getMonth() === todayM &&
        createdDate.getDate() === todayD
      ) {
        const remMins = toMinutes(data.time)
        if (remMins <= currentMinutes) {
          results.push({
            id: docSnapshot.id,
            title: data.title,
            time: data.time,
            repeatMode: data.repeatMode,
            completed: data.completed,
            createdAt: createdDate,
            userId: data.userId || undefined,
          })
        }
      }
    })
    return results
  } catch (error) {
    console.error('Error fetching due reminders:', error)
    return []
  }
}


