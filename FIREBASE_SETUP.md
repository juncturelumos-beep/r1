# Firebase Setup for AudioPlayer

## Prerequisites
- Firebase project created at [Firebase Console](https://console.firebase.google.com/)
- Firebase project with Firestore database enabled

## Configuration Steps

1. **Get Firebase Config**
   - Go to your Firebase project console
   - Click on the gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"
   - Scroll down to "Your apps" section
   - Click on the web app icon (</>)
   - Copy the config object

2. **Update Firebase Config**
   - Open `app/services/firebase.ts`
   - Replace the placeholder values with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

3. **Enable Firestore**
   - In Firebase console, go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" for development
   - Select a location for your database

4. **Create Collection**
   - In Firestore, create a collection named `audioRecordings`
   - This is where your audio files will be stored

## Usage

Once configured, you can:
- Say "play audio" or "open audio player" to launch the AudioPlayer
- The component will automatically fetch audio files from Firebase
- Click on any audio file to play it instantly
- Use the refresh button to load new audio files

## Security Rules (Optional)

For production, consider updating Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /audioRecordings/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

- **"Firebase: Error (auth/unauthorized-domain)"**: Add your domain to authorized domains in Firebase console
- **"Firebase: Error (firestore/permission-denied)"**: Check your Firestore security rules
- **Audio not playing**: Ensure the audio data is properly stored as base64 in Firestore
