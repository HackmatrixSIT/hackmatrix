/**
 * Generate a brown noise WAV file.
 * Run: node scripts/generateBrownNoise.js
 * Output: assets/audio/brown_noise.wav
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;   // Lower sample rate for smaller file
const DURATION_SEC = 5;      // Short loop (will be looped in app)
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const NUM_SAMPLES = SAMPLE_RATE * DURATION_SEC;

// Generate brown noise samples
const samples = new Int16Array(NUM_SAMPLES);
let lastSample = 0;

for (let i = 0; i < NUM_SAMPLES; i++) {
    // Brown noise: integrate white noise
    const white = (Math.random() * 2 - 1) * 0.02;
    lastSample += white;
    // Clamp to prevent drift
    if (lastSample > 1) lastSample = 1;
    if (lastSample < -1) lastSample = -1;
    // Soften volume
    samples[i] = Math.round(lastSample * 16000);
}

// Write WAV file
const dataSize = NUM_SAMPLES * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const buffer = Buffer.alloc(44 + dataSize);

// RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

// fmt sub-chunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);               // Sub-chunk size
buffer.writeUInt16LE(1, 20);                // PCM format
buffer.writeUInt16LE(NUM_CHANNELS, 22);
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 28);
buffer.writeUInt16LE(NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 32);
buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);

// data sub-chunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Write samples
for (let i = 0; i < NUM_SAMPLES; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
}

const outPath = path.join(__dirname, '..', 'assets', 'audio', 'brown_noise.wav');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buffer);
console.log(`Generated: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
