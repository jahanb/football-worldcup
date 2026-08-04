import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

import Match from './models/Match.ts';
import Prediction from './models/Prediction.ts';
import User from './models/User.ts';

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('✓ Connected to MongoDB\n');
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    process.exit(1);
  }
}

async function generateUserReport() {
  try {
    console.log('📊 GENERATING USER PREDICTIONS REPORT...\n');
    console.log('━'.repeat(70) + '\n');

    // Fetch all data
    console.log('📡 Fetching data...');
    const matches = await Match.find({});
    const predictions = await Prediction.find({});
    const users = await User.find({}).sort({ totalPoints: -1 });
    console.log(`✓ Found ${users.length} users, ${predictions.length} predictions, ${matches.length} matches\n`);

    // Build match map for quick lookup
    const matchMap = {};
    for (const match of matches) {
      matchMap[match._id.toString()] = match;
    }

    // Calculate stats for each user
    const userStats = [];

    for (const user of users) {
      const userPredictions = predictions.filter(p => p.userId.toString() === user._id.toString());
      
      let exact = 0;
      let correctResult = 0;
      let goalsCorrect = 0;
      let wrong = 0;
      let total = userPredictions.length;
      
      let exactPoints = 0;
      let resultPoints = 0;
      let goalsPoints = 0;
      let wrongPoints = 0;

      for (const pred of userPredictions) {
        const match = matchMap[pred.matchId.toString()];
        if (!match || !match.isFinished) continue;

        const predScore = pred.points || 0;
        const exactMatch = pred.predHome === match.resultHome && pred.predAway === match.resultAway;
        
        if (exactMatch) {
          exact++;
          exactPoints += predScore;
        } else {
          // Check if result (winner) is correct
          const predWinner = pred.predHome > pred.predAway ? 'home' : pred.predHome < pred.predAway ? 'away' : 'draw';
          const actualWinner = match.resultHome > match.resultAway ? 'home' : match.resultHome < match.resultAway ? 'away' : 'draw';
          
          if (predWinner === actualWinner) {
            correctResult++;
            resultPoints += predScore;
          } else {
            // Check if total goals correct
            const predTotal = pred.predHome + pred.predAway;
            const actualTotal = match.resultHome + match.resultAway;
            
            if (predTotal === actualTotal) {
              goalsCorrect++;
              goalsPoints += predScore;
            } else {
              wrong++;
              wrongPoints += predScore;
            }
          }
        }
      }

      userStats.push({
        username: user.username,
        totalPredictions: total,
        exact,
        correctResult,
        goalsCorrect,
        wrong,
        exactPoints,
        resultPoints,
        goalsPoints,
        wrongPoints,
        totalPoints: user.totalPoints || 0
      });
    }

    console.log('✅ Data processed\n');

    // Generate HTML
    const html = generateHTML(userStats);

    // Write to file
    const outputPath = 'user-predictions-report.html';
    fs.writeFileSync(outputPath, html);

    console.log('━'.repeat(70) + '\n');
    console.log('✅ REPORT GENERATED!\n');
    console.log(`📄 File: ${outputPath}\n`);
    
    // Print summary
    const topUser = userStats[0];
    console.log('Top Predictor:');
    console.log(`  Username: ${topUser.username}`);
    console.log(`  Total Points: ${topUser.totalPoints}`);
    console.log(`  Exact Results: ${topUser.exact}`);
    console.log(`  Correct Results: ${topUser.correctResult}`);
    console.log(`  Goals Correct: ${topUser.goalsCorrect}`);
    console.log(`  Wrong: ${topUser.wrong}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

function generateHTML(userStats) {
  // Calculate totals
  const totals = userStats.reduce((acc, user) => ({
    predictions: acc.predictions + user.totalPredictions,
    exact: acc.exact + user.exact,
    correctResult: acc.correctResult + user.correctResult,
    goalsCorrect: acc.goalsCorrect + user.goalsCorrect,
    wrong: acc.wrong + user.wrong,
    totalPoints: acc.totalPoints + user.totalPoints,
    exactPoints: acc.exactPoints + user.exactPoints,
    resultPoints: acc.resultPoints + user.resultPoints,
    goalsPoints: acc.goalsPoints + user.goalsPoints,
    wrongPoints: acc.wrongPoints + user.wrongPoints
  }), {
    predictions: 0,
    exact: 0,
    correctResult: 0,
    goalsCorrect: 0,
    wrong: 0,
    totalPoints: 0,
    exactPoints: 0,
    resultPoints: 0,
    goalsPoints: 0,
    wrongPoints: 0
  });

  const totalUsers = userStats.length;
  const avgExact = totalUsers > 0 ? (totals.exact / totals.predictions * 100).toFixed(1) : 0;
  const avgCorrectResult = totalUsers > 0 ? (totals.correctResult / totals.predictions * 100).toFixed(1) : 0;
  const avgGoals = totalUsers > 0 ? (totals.goalsCorrect / totals.predictions * 100).toFixed(1) : 0;
  const avgWrong = totalUsers > 0 ? (totals.wrong / totals.predictions * 100).toFixed(1) : 0;

  const rowsHTML = userStats.map((user, idx) => `
    <tr>
      <td class="rank">${idx + 1}</td>
      <td class="username">${user.username}</td>
      <td class="center">${user.totalPredictions}</td>
      <td class="exact-cell">
        <span class="badge exact">${user.exact}</span>
        <span class="points">(${user.exactPoints}pts)</span>
      </td>
      <td class="result-cell">
        <span class="badge result">${user.correctResult}</span>
        <span class="points">(${user.resultPoints}pts)</span>
      </td>
      <td class="goals-cell">
        <span class="badge goals">${user.goalsCorrect}</span>
        <span class="points">(${user.goalsPoints}pts)</span>
      </td>
      <td class="wrong-cell">
        <span class="badge wrong">${user.wrong}</span>
        <span class="points">(${user.wrongPoints}pts)</span>
      </td>
      <td class="total-points">${user.totalPoints}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Cup 2026 - User Predictions Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --pitch: #0B5F3F;
      --light-pitch: #1a8c5c;
      --gold: #E8B547;
      --exact: #27AE60;
      --result: #3498DB;
      --goals: #F39C12;
      --wrong: #E74C3C;
      --white: #FFFFFF;
      --dark: #1A1A1A;
      --gray: #F5F5F5;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, var(--pitch) 0%, #0a4a32 100%);
      color: var(--dark);
      line-height: 1.6;
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    header {
      text-align: center;
      color: var(--white);
      margin-bottom: 50px;
    }

    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }

    h1 {
      font-size: 42px;
      font-weight: 900;
      margin-bottom: 5px;
    }

    .subtitle {
      font-size: 16px;
      opacity: 0.9;
    }

    /* Stats Grid */
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
      margin-bottom: 40px;
    }

    .overview-card {
      background: var(--white);
      padding: 25px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .overview-value {
      font-size: 32px;
      font-weight: 900;
      margin-bottom: 5px;
    }

    .overview-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    /* Legend */
    .legend {
      background: var(--white);
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .legend-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 15px;
      color: var(--pitch);
    }

    .legend-items {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .legend-text {
      font-size: 13px;
    }

    /* Table */
    .table-section {
      background: var(--white);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .table-title {
      padding: 25px;
      background: linear-gradient(135deg, var(--pitch) 0%, var(--light-pitch) 100%);
      color: var(--white);
      font-size: 20px;
      font-weight: 800;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: var(--gray);
      border-bottom: 2px solid var(--gold);
    }

    th {
      padding: 15px;
      text-align: left;
      font-weight: 700;
      color: var(--pitch);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    tbody tr {
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: var(--gray);
    }

    td {
      padding: 15px;
      font-size: 14px;
    }

    .rank {
      font-weight: 900;
      color: var(--pitch);
      font-size: 16px;
      width: 40px;
    }

    .username {
      font-weight: 600;
      min-width: 150px;
    }

    .center {
      text-align: center;
      font-weight: 600;
    }

    .exact-cell,
    .result-cell,
    .goals-cell,
    .wrong-cell {
      text-align: center;
    }

    .badge {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 4px;
      font-weight: 700;
      color: var(--white);
      font-size: 13px;
      margin-right: 5px;
    }

    .badge.exact {
      background: var(--exact);
    }

    .badge.result {
      background: var(--result);
    }

    .badge.goals {
      background: var(--goals);
    }

    .badge.wrong {
      background: var(--wrong);
    }

    .points {
      font-size: 11px;
      color: #666;
      font-weight: 500;
    }

    .total-points {
      font-weight: 900;
      color: var(--gold);
      font-size: 16px;
      text-align: center;
    }

    /* Footer totals */
    .totals-row {
      background: var(--gray);
      font-weight: 800;
      border-top: 2px solid var(--gold);
      border-bottom: 2px solid var(--gold);
    }

    .totals-row td {
      padding: 20px 15px;
      color: var(--pitch);
    }

    @media (max-width: 1024px) {
      .overview-grid { grid-template-columns: repeat(2, 1fr); }
      th { font-size: 10px; }
      td { font-size: 13px; padding: 10px; }
    }

    @media (max-width: 768px) {
      h1 { font-size: 28px; }
      .overview-grid { grid-template-columns: 1fr; }
      table { font-size: 11px; }
      .badge { padding: 4px 8px; font-size: 11px; }
      .points { display: block; margin-top: 2px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">⚽ 🏆</div>
      <h1>World Cup 2026</h1>
      <p class="subtitle">User Predictions Analysis Report</p>
    </header>

    <div class="overview-grid">
      <div class="overview-card">
        <div class="overview-value">${totalUsers}</div>
        <div class="overview-label">Total Users</div>
      </div>
      <div class="overview-card">
        <div class="overview-value">${totals.predictions}</div>
        <div class="overview-label">Total Predictions</div>
      </div>
      <div class="overview-card">
        <div class="overview-value">${totals.exact}</div>
        <div class="overview-label">Exact Results</div>
      </div>
      <div class="overview-card">
        <div class="overview-value">${totals.correctResult}</div>
        <div class="overview-label">Correct Results</div>
      </div>
      <div class="overview-card">
        <div class="overview-value">${totals.goalsCorrect}</div>
        <div class="overview-label">Goals Correct</div>
      </div>
      <div class="overview-card">
        <div class="overview-value">${totals.wrong}</div>
        <div class="overview-label">Wrong Predictions</div>
      </div>
      <div class="overview-card">
        <div class="overview-value">${totals.totalPoints}</div>
        <div class="overview-label">Total Points</div>
      </div>
    </div>

    <div class="legend">
      <div class="legend-title">📊 Prediction Categories</div>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-color" style="background: var(--exact);"></div>
          <div class="legend-text">
            <strong>Exact Results:</strong> Correct score (e.g., 2-1) → ${avgExact}% accuracy
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--result);"></div>
          <div class="legend-text">
            <strong>Correct Results:</strong> Right winner but wrong score → ${avgCorrectResult}% accuracy
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--goals);"></div>
          <div class="legend-text">
            <strong>Goals Correct:</strong> Right total goals but wrong winner → ${avgGoals}% accuracy
          </div>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: var(--wrong);"></div>
          <div class="legend-text">
            <strong>Wrong:</strong> Incorrect prediction → ${avgWrong}% accuracy
          </div>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-title">🏅 User Prediction Statistics</div>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Total Preds</th>
            <th>Exact ✓</th>
            <th>Result ✓</th>
            <th>Goals ✓</th>
            <th>Wrong ✗</th>
            <th>Total Points</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
          <tr class="totals-row">
            <td colspan="2"><strong>TOTALS</strong></td>
            <td class="center"><strong>${totals.predictions}</strong></td>
            <td class="center"><strong>${totals.exact}</strong> (${totals.exactPoints})</td>
            <td class="center"><strong>${totals.correctResult}</strong> (${totals.resultPoints})</td>
            <td class="center"><strong>${totals.goalsCorrect}</strong> (${totals.goalsPoints})</td>
            <td class="center"><strong>${totals.wrong}</strong> (${totals.wrongPoints})</td>
            <td class="center"><strong>${totals.totalPoints}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

connectDatabase().then(() => generateUserReport());
