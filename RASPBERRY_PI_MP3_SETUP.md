# Raspberry Pi MP3 Setup Guide

## Problem
ElevenLabs returns MP3 audio files, but Raspberry Pi doesn't have MP3 codecs installed by default. This causes audio playback to fail.

## Solution 1: Install MP3 Codecs (Recommended)

### Update your Raspberry Pi:
```bash
sudo apt update
sudo apt upgrade
```

### Install MP3 support:
```bash
# Install MP3 codecs and players
sudo apt install mpg123
sudo apt install vlc
sudo apt install ffmpeg

# Install additional audio codecs
sudo apt install libavcodec-extra
sudo apt install libavformat-extra
```

### Test MP3 playback:
```bash
# Test with mpg123
mpg123 test.mp3

# Test with ffplay
ffplay test.mp3
```

## Solution 2: Browser MP3 Support

### Install Chromium with MP3 support:
```bash
# Remove existing Chromium if needed
sudo apt remove chromium-browser

# Install Chromium with MP3 support
sudo apt install chromium-browser
```

### Enable MP3 in Chromium:
1. Open Chromium
2. Go to `chrome://flags/`
3. Search for "MP3"
4. Enable "MP3 Audio Support"
5. Restart Chromium

## Solution 3: Alternative Audio Formats

If MP3 still doesn't work, we can modify the ElevenLabs service to request different audio formats.

## Solution 4: Fallback Audio System

The application already has a fallback audio system that uses Web Audio API to generate simple tones when MP3 playback fails.

## Testing

1. **Test MP3 playback in terminal:**
   ```bash
   # Download a test MP3
   wget https://www.soundjay.com/misc/sounds/bell-ringing-05.wav -O test.mp3
   
   # Try to play it
   mpg123 test.mp3
   ```

2. **Test in browser:**
   - Open the ElevenLabs Debug page: `/elevenlabs-debug`
   - Click "Test ElevenLabs API"
   - Check if audio plays

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for audio-related errors
   - Check if MP3 format is supported

## Troubleshooting

### If MP3 still doesn't work:

1. **Check audio hardware:**
   ```bash
   # Check audio devices
   aplay -l
   
   # Test audio output
   speaker-test -t wav -c 2
   ```

2. **Install additional codecs:**
   ```bash
   sudo apt install ubuntu-restricted-extras
   ```

3. **Use a different browser:**
   - Try Firefox instead of Chromium
   - Install Firefox: `sudo apt install firefox-esr`

4. **Check system audio:**
   ```bash
   # Check if audio is muted
   amixer get Master
   
   # Unmute if needed
   amixer set Master unmute
   amixer set Master 50%
   ```

## Alternative: Use WAV Format

If MP3 continues to be problematic, we can modify the ElevenLabs service to request WAV format instead:

```typescript
// In elevenLabs.ts, change the API call to request WAV
const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
  method: 'POST',
  headers: {
    'xi-api-key': this.apiKey,
    'Content-Type': 'application/json',
    'Accept': 'audio/wav'  // Request WAV instead of MP3
  },
  body: JSON.stringify(requestBody)
});
```

## Quick Fix Commands

Run these commands on your Raspberry Pi:

```bash
# Quick MP3 setup
sudo apt update
sudo apt install mpg123 ffmpeg libavcodec-extra
sudo apt install chromium-browser

# Test audio
speaker-test -t wav -c 2 -l 1
```

After running these commands, restart your browser and try the ElevenLabs audio again.
