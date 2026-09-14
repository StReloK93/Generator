export type GameState = 'ready' | 'build_prep' | 'wave_running' | 'wave_completed' | 'game_over' | 'victory'

export class GameStateMachine {
  /**
   * Calculates player lives deduction on unit leak, returning updated lives and whether game is over.
   */
  public static deductLife(currentLives: number): { remainingLives: number; isGameOver: boolean } {
    const remainingLives = Math.max(0, currentLives - 1)
    return {
      remainingLives,
      isGameOver: remainingLives <= 0,
    }
  }

  /**
   * Evaluates wave completion conditions and decides whether the match is won or advances to next wave prep.
   */
  public static evaluateWaveCompletion(
    currentWaveIndex: number,
    totalWaves: number
  ): { nextState: GameState; isVictory: boolean } {
    if (currentWaveIndex >= totalWaves - 1) {
      return {
        nextState: 'victory',
        isVictory: true,
      }
    }
    return {
      nextState: 'build_prep',
      isVictory: false,
    }
  }
}
