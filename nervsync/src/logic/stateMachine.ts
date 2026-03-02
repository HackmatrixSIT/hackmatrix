import { AppState } from '../store/useStressStore';

export class StateMachine {
    private static readonly CALM_THRESHOLD = 30;
    private static readonly AGITATION_THRESHOLD = 60;

    /**
     * Transition function that decides the next AppState based on stressScore
     * and current state.
     */
    public static transition(
        currentScore: number,
        currentState: AppState
    ): AppState {
        if (currentScore > this.AGITATION_THRESHOLD) {
            return 'AGITATION';
        } else if (currentScore > this.CALM_THRESHOLD) {
            return 'STRESS';
        } else {
            return 'CALM';
        }
    }

    /**
     * Persistence Check: Only transition state if condition holds for N samples
     * Preventing "flickering" between states.
     */
    public static shouldTransition(
        history: AppState[],
        newState: AppState,
        threshold = 3
    ): boolean {
        if (history.length < threshold) return false;
        // Check if the last N items are all the same state
        return history.every((state) => state === newState);
    }
}
