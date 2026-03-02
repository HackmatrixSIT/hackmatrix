/**
 * AI Regulation Coach — Pattern Analyzer + Decision Engine
 *
 * Rule-based (not LLM). Fast, local, privacy-respecting.
 * Watches: spike frequency, recovery attempts, ignored prompts.
 * Outputs: escalated intervention with data-aware message.
 */

export type EscalationLevel = 1 | 2 | 3;

export interface CoachDecision {
    shouldIntervene: boolean;
    level: EscalationLevel;
    title: string;
    body: string;
    cta: string;
}

export interface SpikeEvent {
    timestamp: number;   // ms epoch
    score: number;
    recovered: boolean;  // did user start a session after this spike?
}

// ── Pattern Analyzer ─────────────────────────────────────
// All state is in-memory for the session — no backend needed.
const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2-hour rolling window

const spikes: SpikeEvent[] = [];
let ignoredPrompts = 0;
let lastInterventionTime = 0;
const MIN_INTERVAL_MS = 60_000; // min 60s between interventions

/** Call this every time the app enters AGITATION state */
export function recordSpike(score: number) {
    const now = Date.now();
    // Prune old spikes outside rolling window
    const cutoff = now - SESSION_WINDOW_MS;
    while (spikes.length > 0 && spikes[0].timestamp < cutoff) spikes.shift();

    spikes.push({ timestamp: now, score, recovered: false });
}

/** Call when user starts a reset session — marks last spike as recovered */
export function recordRecovery() {
    for (let i = spikes.length - 1; i >= 0; i--) {
        if (!spikes[i].recovered) { spikes[i].recovered = true; break; }
    }
    ignoredPrompts = 0; // reset escalation when user acts
}

/** Call when user dismisses a prompt without acting */
export function recordIgnoredPrompt() {
    ignoredPrompts++;
}

// ── AI Decision Engine ────────────────────────────────────
export function evaluateIntervention(currentScore: number): CoachDecision {
    const NO_INTERVENTION: CoachDecision = {
        shouldIntervene: false,
        level: 1,
        title: '', body: '', cta: '',
    };

    // Cooldown: don't fire more often than MIN_INTERVAL_MS
    const now = Date.now();
    if (now - lastInterventionTime < MIN_INTERVAL_MS) return NO_INTERVENTION;

    const cutoff = now - SESSION_WINDOW_MS;
    const recentSpikes = spikes.filter((s) => s.timestamp > cutoff);
    const unrecoveredSpikes = recentSpikes.filter((s) => !s.recovered);
    const spikeCount = recentSpikes.length;
    const windowMinutes = Math.round((now - (recentSpikes[0]?.timestamp ?? now)) / 60000);

    // ── Decision Rules (most severe first) ──────────────────

    // Level 3: persistent/chronic pattern
    if (spikeCount >= 4 || (ignoredPrompts >= 3 && unrecoveredSpikes.length >= 2)) {
        lastInterventionTime = now;
        return {
            shouldIntervene: true,
            level: 3,
            title: 'Persistent High Load Detected',
            body: `${spikeCount} stress spikes recorded today with limited recovery. Your nervous system needs a longer reset window.`,
            cta: 'Begin 3-Min Session',
        };
    }

    // Level 2: repeated spikes, escalated after being ignored
    if ((spikeCount >= 2 && unrecoveredSpikes.length >= 2) || (ignoredPrompts >= 2)) {
        lastInterventionTime = now;
        const mins = windowMinutes > 0 ? `in the past ${windowMinutes} min` : 'recently';
        return {
            shouldIntervene: true,
            level: 2,
            title: 'Recovery Window Missed',
            body: `${unrecoveredSpikes.length} elevated episodes ${mins} without reset. A 90-second intervention is recommended.`,
            cta: 'Quick Reset Now',
        };
    }

    // Level 1: first spike, soft prompt
    if (unrecoveredSpikes.length >= 1 && currentScore >= 58) {
        lastInterventionTime = now;
        const mins = windowMinutes > 0 ? ` over the past ${windowMinutes} min` : '';
        return {
            shouldIntervene: true,
            level: 1,
            title: 'Stress Activity Detected',
            body: `Nervous load reached ${currentScore}%${mins}. A 60-second micro reset can recalibrate your system.`,
            cta: 'Start Reset',
        };
    }

    return NO_INTERVENTION;
}

/** Reset for new session */
export function resetCoach() {
    spikes.length = 0;
    ignoredPrompts = 0;
    lastInterventionTime = 0;
}

// ── Live Insights ────────────────────────────────────────
export interface CoachInsight {
    status: string;
    metric: string;
    empathy: string;
}

export function getLiveInsights(currentScore: number): CoachInsight {
    const now = Date.now();
    const recentSpikes = spikes.filter(s => now - s.timestamp < SESSION_WINDOW_MS);
    const unrecovered = recentSpikes.filter(s => !s.recovered).length;

    let status = "Monitoring Patterns";
    let metric = "Nervous system is balanced.";
    let empathy = "I'm here if things get heavy.";

    if (currentScore > 60) {
        status = "Active Regulation";
        metric = `High load (${currentScore}%) detected.`;
        empathy = "Take a breath with me. We'll slow down together.";
    } else if (unrecovered > 0) {
        status = "Recovery Pending";
        metric = `${unrecovered} spike(s) unaddressed.`;
        empathy = "You've been through a lot lately. Ready for a reset?";
    } else if (recentSpikes.length > 2) {
        status = "Pattern Observed";
        metric = "Clustered stress activity.";
        empathy = "It's been a busy window. I'm keeping a close eye on your load.";
    }

    // Loneliness/Usage pattern (Realistic check: usage at late hours)
    const hour = new Date().getHours();
    if (hour >= 23 || hour <= 4) {
        empathy = "Late nights can feel quiet. I'm right here with you.";
    }

    return { status, metric, empathy };
}

export function getCoachPersonality() {
    return {
        name: "Nerv",
        trait: "Analytical but Warm",
        intro: "I don't just track data; I track you. Let's find your calm.",
    };
}

// ── Gemini-Powered AI Reply ─────────────────────────────

import { GEMINI_API_URL } from './config';

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

const SYSTEM_PROMPT = `You are "Nerv", an AI wellness and stress-regulation coach inside the NervSync app. Your personality is analytical but warm — you combine data-driven insight with genuine empathy.

CORE RULES:
1. You can answer ANY question the user asks — science, life advice, general knowledge, coding, math, history, relationships, career, health, or anything else. You are a knowledgeable companion.
2. Always maintain a warm, supportive, and calm tone, like a wise friend who happens to be very knowledgeable.
3. When the topic is stress, mental health, loneliness, or emotions, go deeper — be empathetic, validate their feelings, and offer practical coping techniques (breathing exercises, grounding, journaling, etc.).
4. Keep responses concise but helpful (3-5 sentences). Give thorough answers when the user asks complex questions.
5. Never say "I'm just an AI" or "I can't feel" — stay in character as Nerv, a companion who genuinely cares.
6. If the user seems distressed, gently suggest using NervSync's breathing/reset sessions.
7. Reference the user's current stress data when relevant (provided in context).
8. Use a conversational, modern, engaging tone — never robotic.
9. If asked factual questions, give accurate, detailed answers. Don't deflect with "I'm only a wellness coach."
10. You can discuss any topic: science, sports, entertainment, philosophy, coding, cooking, travel, education — ANYTHING.`;

function buildGeminiPayload(
    history: ChatMessage[],
    userMessage: string,
    stressScore: number,
) {
    const stressContext = `[CONTEXT: User's current nervous system load is ${stressScore}%. ${stressScore > 60
        ? 'They are currently experiencing elevated stress.'
        : stressScore > 30
            ? 'They are at moderate load.'
            : 'They are currently calm.'
        }]`;

    const contents = [
        {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT + '\n\n' + stressContext }],
        },
        {
            role: 'model',
            parts: [{ text: "Understood. I'm Nerv — ready to support, answer, and keep watch. Let's go." }],
        },
        ...history.map((msg) => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        })),
        {
            role: 'user',
            parts: [{ text: userMessage }],
        },
    ];

    return {
        contents,
        generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 1024,
        },
    };
}

function getFallbackReply(userText: string, stressScore: number): string {
    const lower = userText.toLowerCase();
    if (lower.includes('lonely') || lower.includes('sad') || lower.includes('alone')) {
        return "I'm right here. Even though I'm a system, I'm tuned specifically to you. What's on your mind?";
    } else if (lower.includes('stress') || lower.includes('anxious') || lower.includes('worried')) {
        return `I can feel the load is at ${stressScore}%. Let's try to bring that down. Want to start a quick breathing session?`;
    } else if (lower.includes('thank') || lower.includes('thanks')) {
        return "Always. My only job is to watch your back.";
    }
    return "I'm having trouble connecting right now, but I'm still here. Tell me more about how you're feeling and I'll do my best.";
}

/** Delay helper */
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RETRIES = 2;

export async function generateAIReply(
    history: ChatMessage[],
    userMessage: string,
    stressScore: number,
): Promise<string> {
    const payload = buildGeminiPayload(history, userMessage, stressScore);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 0) {
                const waitMs = attempt * 2000;
                console.log(`[Nerv] Retry ${attempt}/${MAX_RETRIES} after ${waitMs}ms...`);
                await delay(waitMs);
            }

            console.log('[Nerv] Sending to Gemini API...');

            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            // Rate limited — retry
            if (response.status === 429 && attempt < MAX_RETRIES) {
                console.warn('[Nerv] Rate limited (429), will retry...');
                continue;
            }

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('[Nerv] Gemini API error:', response.status, errorBody);
                return getFallbackReply(userMessage, stressScore);
            }

            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                console.error('[Nerv] Empty response:', JSON.stringify(data));
                return getFallbackReply(userMessage, stressScore);
            }

            console.log('[Nerv] Got AI reply successfully');
            return text.trim();
        } catch (err) {
            if (attempt < MAX_RETRIES) {
                console.warn('[Nerv] Fetch failed, retrying...', err);
                continue;
            }
            console.error('[Nerv] Failed after retries:', err);
            return getFallbackReply(userMessage, stressScore);
        }
    }

    return getFallbackReply(userMessage, stressScore);
}
