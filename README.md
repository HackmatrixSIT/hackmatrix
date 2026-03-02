# 🧠 NervSync — A Frictionless Nervous System Regulator

**NervSync** is a bio-reactive mobile app that detects stress passively through device sensors and regulates your nervous system through embodied interaction — not cognitive engagement. Your phone becomes a nervous system mirror, not a diary.

> **Zero-friction micro-interventions.** No typing. No forms. No surveys.

---

## ✨ Features

### 🎯 Sensor Monitoring Engine
- Continuously gathers **accelerometer** and **gesture data**
- Calculates real-time **Stress Score (0–100)** using movement intensity, tap frequency, and gesture velocity
- Processes at 10Hz with rolling-average smoothing to filter sensor noise

### 🔄 Nervous System State Engine
- **Three-state machine**: `CALM → STRESS → AGITATION`
- Hysteresis-based transitions with hold timers to prevent false state changes
- Configurable entry/exit thresholds for reliable detection

### 🫧 Gravity Breathing Orb (Primary Intervention)
- Floating orb with sinusoidal breathing animation
- **Adaptive rhythm**: breathing timing adjusts based on live stress score
- Haptic pulse synchronization during inhale/exhale
- Touch-responsive particle field — place your finger to sync your breathing

### 🌀 Chaos Field (High Stress Mode)
- Animated particle system that reacts to your stress level
- 20+ particles with physics-based movement tied to stress score
- Visual representation of nervous system load

### 🛡️ Environmental Stress Radar & FocusShield
- **Real-time audio metering** via microphone (no audio stored — metering only)
- Computes **sensoryLoad (0–100)** from:
  - Average dB level (40%)
  - Rolling variance (30%)
  - Spike detection — >15dB jump in <1s (30%)
- When sensoryLoad > 60 → **FocusShield** activates:
  - Calming audio loop
  - Simplified UI mode
  - Modal with real-time environment metrics
- Works fully **offline** — bundled audio asset

### 🤖 Nerv — AI Wellness Coach (Gemini-Powered)
- Powered by **Google Gemini 2.0 Flash** for intelligent, contextual responses
- Can answer **any question** — science, life advice, coding, mental health, and more
- Stays in character as "Nerv" — analytical yet warm companion
- **Stress-aware**: references your live nervous system data in responses
- Multi-turn conversation memory (last 20 turns)
- Typing indicator with "Nerv is thinking…" animation
- Automatic retry with backoff on rate limits
- Graceful offline fallback to keyword-matched responses

### 🧘 Guided Meditation
- Breath field visualization with animated concentric rings
- Intensity-adaptive breathing rhythm (LOW / MODERATE / HIGH)
- **Dynamic timing**: each cycle recalculates from your live stress score
- Ambient calming music loop (bundled, works offline)
- Mute toggle and session timer
- Gesture-responsive particle field — finger tracking disturbs the visual field

### 🎮 Regulation Game
- Interactive gamification of nervous system regulation
- Engaging exercises to redirect stress energy

### 📊 Baseline Scan
- 10-second calibration scan to determine your baseline stress intensity
- Sets personalized thresholds for the entire session

### 🔥 Auto-Trigger Overlay
- Fires automatically when sensors detect **AGITATION** state
- Escalating intervention system (Level 1 → 2 → 3) based on:
  - Spike frequency
  - Recovery attempts
  - Ignored prompts
- Data-aware messages with contextual recommendations

---

## 🏗️ Architecture

```
Sensor Layer (Accelerometer + Audio Metering)
        ↓
Signal Processing Layer (Rolling averages, variance, spike detection)
        ↓
State Classification Engine (State machine + Sensory engine)
        ↓
Intervention Controller (AI Coach + FocusShield + Auto-trigger)
        ↓
UI + Haptic Output (Breathing Orb, Chaos Field, Adaptive UI)
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Expo SDK 54** + React Native | Cross-platform mobile framework |
| **TypeScript** | Type-safe development |
| **expo-sensors** | Accelerometer data |
| **expo-av** | Audio metering + ambient playback |
| **expo-haptics** | Haptic rhythm pacing |
| **react-native-reanimated** | 60fps animations |
| **react-native-gesture-handler** | Touch + gesture tracking |
| **Zustand** | Global state management |
| **Google Gemini API** | AI-powered wellness coach |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Installation

```bash
# Clone the repository
git clone https://github.com/HackmatrixSIT/hackmatrix.git
cd hackmatrix/nervsync

# Install dependencies
npm install

# Start the app
npx expo start
```

Scan the QR code with Expo Go to run on your device.

### AI Coach Setup (Optional)
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open `src/logic/config.ts`
3. Replace the API key placeholder with your key

---

## 📁 Project Structure

```
nervsync/
├── app/(tabs)/          # App entry + routing
├── src/
│   ├── logic/           # Core engines
│   │   ├── aiCoach.ts       # AI regulation coach + Gemini integration
│   │   ├── audioRadar.ts    # Microphone metering (no storage)
│   │   ├── sensoryEngine.ts # Sensory load computation
│   │   ├── stressEngine.ts  # Stress score calculation
│   │   ├── stateMachine.ts  # State transitions
│   │   └── config.ts        # API configuration
│   ├── sensors/         # Sensor hooks
│   │   └── motionListener.ts
│   ├── screens/         # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── CoachChatScreen.tsx
│   │   ├── MeditationScreen.tsx
│   │   ├── GameScreen.tsx
│   │   └── BaselineScanScreen.tsx
│   ├── components/      # Reusable components
│   │   ├── FocusShield.tsx
│   │   ├── BreathingOrb.tsx
│   │   └── ChaosField.tsx
│   └── store/           # Zustand state
│       └── useStressStore.ts
├── hooks/               # Custom React hooks
│   └── useSensoryLoad.ts
└── assets/              # Audio + images
    └── audio/
```

---

## 🔒 Privacy

- **No audio recording stored** — microphone is used for metering only
- **No personal data collected** — all processing is local
- **No login required** — zero-friction experience
- **Works fully offline** — no network dependency for core features

---

## 👥 Team

**HackmatrixSIT** — Built with ❤️ for nervous system wellness.

---

## 📄 License

This project is private and developed for hackathon purposes.
