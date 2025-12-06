export function calculatePoints(predHome: number, predAway: number, actHome: number, actAway: number) {
    let points = 0;

    // Rule 1: Number of goals of each team (1 point each)
    if (predHome === actHome) points += 1;
    if (predAway === actAway) points += 1;

    // Rule 2: Correct Difference (1 point)
    const predDiff = predHome - predAway;
    const actDiff = actHome - actAway;
    if (predDiff === actDiff) points += 1;

    // Rule 3: Correct Result (Win/Draw/Loss) (2 points)
    // Win: Diff > 0, Draw: Diff == 0, Loss: Diff < 0
    const predSign = Math.sign(predDiff);
    const actSign = Math.sign(actDiff);

    if (predSign === actSign) points += 2;

    // Example verification: 
    // Actual 1-1, Pred 1-1 -> Goals(2) + Diff(1) + Result(2) = 5
    // Actual 2-1, Pred 2-1 -> Goals(2) + Diff(1) + Result(2) = 5
    // Actual 2-1, Pred 1-0 -> Goals(0) + Diff(1) + Result(2) = 3

    return points;
}