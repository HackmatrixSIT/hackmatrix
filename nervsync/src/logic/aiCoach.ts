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
