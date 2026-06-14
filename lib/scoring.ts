/**
 * Scoring Module - Production Implementation
 * 
 * Scoring Rules:
 * - 1 point: Home team goals match
 * - 1 point: Away team goals match
 * - 1 point: Goal difference matches
 * - 2 points: Result (Win/Draw/Loss) matches
 * - Max: 5 points per prediction
 * 
 * Examples:
 * - Predicted 2-1, Actual 2-1: 5 points (all rules)
 * - Predicted 3-0, Actual 2-0: 4 points (goals away wrong, but diff & result correct)
 * - Predicted 1-2, Actual 2-1: 0 points (all wrong)
 */

/**
 * Score breakdown type for detailed reporting
 */
export type ScoreBreakdown = "H-Goal" | "A-Goal" | "Diff" | "Result";

/**
 * Result of score calculation
 */
export interface CalculationResult {
  points: number;
  breakdown: ScoreBreakdown[];
  details: {
    homeGoalMatch: boolean;
    awayGoalMatch: boolean;
    diffMatch: boolean;
    resultMatch: boolean;
  };
}

/**
 * Calculate points for a prediction based on actual match result
 * 
 * @param predHome - Predicted home team goals
 * @param predAway - Predicted away team goals
 * @param actualHome - Actual home team goals
 * @param actualAway - Actual away team goals
 * @returns {CalculationResult} Points earned and breakdown
 * 
 * @example
 * const result = calculatePoints(2, 1, 2, 1);
 * // { points: 5, breakdown: ["H-Goal", "A-Goal", "Diff", "Result"] }
 */
export function calculatePoints(
  predHome: any,
  predAway: any,
  actualHome: any,
  actualAway: any
): CalculationResult {
  let points = 0;
  const breakdown: ScoreBreakdown[] = [];

  // Force everything to Numbers immediately (handles string inputs from DB)
  const pH = Number(predHome);
  const pA = Number(predAway);
  const aH = Number(actualHome);
  const aA = Number(actualAway);

  // Safety check: if any value is not a number, return 0
  if (isNaN(pH) || isNaN(pA) || isNaN(aH) || isNaN(aA)) {
    return {
      points: 0,
      breakdown: [],
      details: {
        homeGoalMatch: false,
        awayGoalMatch: false,
        diffMatch: false,
        resultMatch: false,
      },
    };
  }

  // Rule 1: Home goals match (1 point)
  const homeGoalMatch = pH === aH;
  if (homeGoalMatch) {
    points += 1;
    breakdown.push("H-Goal");
  }

  // Rule 2: Away goals match (1 point)
  const awayGoalMatch = pA === aA;
  if (awayGoalMatch) {
    points += 1;
    breakdown.push("A-Goal");
  }

  // Rule 3: Goal difference match (1 point)
  const predDiff = pH - pA;
  const actualDiff = aH - aA;
  const diffMatch = predDiff === actualDiff;
  if (diffMatch) {
    points += 1;
    breakdown.push("Diff");
  }

  // Rule 4: Result match - Win/Draw/Loss (2 points)
  const predSign = Math.sign(predDiff); // 1 (home win), 0 (draw), -1 (away win)
  const actualSign = Math.sign(actualDiff);
  const resultMatch = predSign === actualSign;
  if (resultMatch) {
    points += 2;
    breakdown.push("Result");
  }

  return {
    points,
    breakdown,
    details: {
      homeGoalMatch,
      awayGoalMatch,
      diffMatch,
      resultMatch,
    },
  };
}

/**
 * Format score calculation result for logging/display
 * 
 * @param prediction - Predicted score (e.g., "2-1")
 * @param actual - Actual score (e.g., "2-1")
 * @param result - Calculation result
 * @returns Formatted string for logging
 * 
 * @example
 * const str = formatScoreLog("2-1", "2-1", { points: 5, breakdown: [...] });
 * // "Pred 2-1 | Actual 2-1 | Earned: 5 pts (H-Goal, A-Goal, Diff, Result)"
 */
export function formatScoreLog(
  prediction: string,
  actual: string,
  result: CalculationResult
): string {
  const breakdownStr = result.breakdown.join(", ");
  return `Pred ${prediction} | Actual ${actual} | Earned: ${result.points} pts${
    breakdownStr ? ` (${breakdownStr})` : ""
  }`;
}

/**
 * Calculate point difference for atomic updates
 * (Handles cases where a score is updated multiple times)
 * 
 * @param newPoints - Newly calculated points
 * @param oldPoints - Previously awarded points
 * @returns The difference to increment/decrement user total by
 * 
 * @example
 * // Initial calculation: 3 points
 * // Score gets updated, recalculation gives 5 points
 * const diff = calculatePointDifference(5, 3); // 2
 * // User totalPoints is incremented by 2
 */
export function calculatePointDifference(
  newPoints: number,
  oldPoints: any
): number {
  const oldPointsNum = Number(oldPoints) || 0;
  return newPoints - oldPointsNum;
}

/**
 * Validate score input
 * 
 * @param homeScore - Home team score
 * @param awayScore - Away team score
 * @returns { valid: boolean, error?: string }
 */
export function validateScores(
  homeScore: any,
  awayScore: any
): { valid: boolean; error?: string } {
  const h = Number(homeScore);
  const a = Number(awayScore);

  if (isNaN(h)) {
    return { valid: false, error: "Invalid home score" };
  }
  if (isNaN(a)) {
    return { valid: false, error: "Invalid away score" };
  }
  if (h < 0 || a < 0) {
    return { valid: false, error: "Scores cannot be negative" };
  }
  if (!Number.isInteger(h) || !Number.isInteger(a)) {
    return { valid: false, error: "Scores must be integers" };
  }

  return { valid: true };
}

/**
 * Get result outcome string for display
 * 
 * @param home - Home team goals
 * @param away - Away team goals
 * @returns "Home Win" | "Draw" | "Away Win"
 */
export function getResultOutcome(home: number, away: number): string {
  if (home > away) return "Home Win";
  if (home < away) return "Away Win";
  return "Draw";
}

/**
 * Detailed score explanation for user feedback
 * 
 * @param predHome - Predicted home score
 * @param predAway - Predicted away score
 * @param actualHome - Actual home score
 * @param actualAway - Actual away score
 * @returns Detailed explanation
 * 
 * @example
 * const explanation = getScoreExplanation(2, 1, 2, 1);
 * // "Home goal correct (2) ✓\nAway goal correct (1) ✓\n..."
 */
export function getScoreExplanation(
  predHome: any,
  predAway: any,
  actualHome: any,
  actualAway: any
): string {
  const pH = Number(predHome);
  const pA = Number(predAway);
  const aH = Number(actualHome);
  const aA = Number(actualAway);

  const lines: string[] = [];

  lines.push(`Your Prediction: ${pH}-${pA}`);
  lines.push(`Actual Result:   ${aH}-${aA}`);
  lines.push("");

  // Home goal
  lines.push(
    `Home Goal: ${pH === aH ? "✓ Correct" : "✗ Wrong"} (Predicted ${pH}, Actual ${aH})`
  );

  // Away goal
  lines.push(
    `Away Goal: ${pA === aA ? "✓ Correct" : "✗ Wrong"} (Predicted ${pA}, Actual ${aA})`
  );

  // Difference
  const predDiff = pH - pA;
  const actualDiff = aH - aA;
  lines.push(
    `Difference: ${predDiff === actualDiff ? "✓ Correct" : "✗ Wrong"} (Predicted ${
      predDiff > 0 ? "+" : ""
    }${predDiff}, Actual ${actualDiff > 0 ? "+" : ""}${actualDiff})`
  );

  // Result
  const predResult = getResultOutcome(pH, pA);
  const actualResult = getResultOutcome(aH, aA);
  lines.push(
    `Result: ${predResult === actualResult ? "✓ Correct" : "✗ Wrong"} (Predicted ${predResult}, Actual ${actualResult})`
  );

  return lines.join("\n");
}

/**
 * Export all for backward compatibility
 */
export default {
  calculatePoints,
  calculatePointDifference,
  validateScores,
  getResultOutcome,
  getScoreExplanation,
  formatScoreLog,
};