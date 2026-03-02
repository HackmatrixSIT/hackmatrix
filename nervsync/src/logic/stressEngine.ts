export class StressEngine {
    private static readonly WINDOW_SIZE = 50; // Rolling 5 seconds at 10Hz
    private movementHistory: number[] = [];
    private tapHistory: number[] = [];
    private gestureHistory: number[] = [];

    /**
     * Calculates Normalized Stress Score (0-100)
     * Formula: (movementScore * 0.5) + (tapScore * 0.3) + (gestureScore * 0.2)
     */
    public static calculate(
        movementIntensity: number,
        tapFrequency: number,
        gestureVelocity: number
    ): number {
        // Basic normalization for movement intensity (expecting 0 to ~2-3G as raw input)
        // Map movementIntensity to 0-100
        const mScore = Math.min(100, movementIntensity * 33);

        // Tap frequency (0 to 10 taps/sec)
        const tScore = Math.min(100, tapFrequency * 10);

        // Gesture velocity (normalized 0-100)
        const gScore = Math.min(100, gestureVelocity);

        const finalScore = (mScore * 0.5) + (tScore * 0.3) + (gScore * 0.2);

        return Math.round(finalScore);
    }

    /**
     * Smooths the score over time using a simple moving average
     */
    public static smooth(history: number[], newScore: number): number {
        history.push(newScore);
        if (history.length > 5) history.shift();
        const sum = history.reduce((a, b) => a + b, 0);
        return Math.round(sum / history.length);
    }
}
