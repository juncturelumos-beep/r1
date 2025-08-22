import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Initialize with inline config (no env vars)
const firebaseConfig = {
  apiKey: 'AIzaSyCnU9DiKNwanBihx2o5W6WO6W5DBYbNgMc',
  authDomain: 'aiassistant-33e75.firebaseapp.com',
  projectId: 'aiassistant-33e75',
  storageBucket: 'aiassistant-33e75.appspot.com',
  messagingSenderId: '25705522426',
  appId: '1:25705522426:web:aaa500212541fee1275543',
  measurementId: 'G-WBG1N9P4JJ',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const db = getFirestore(app)


