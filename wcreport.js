import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

async function generateReport() {
  try {
    console.log('📊 GENERATING WORLD CUP 2026 REPORT...\n');
    console.log('━'.repeat(70) + '\n');

    // Fetch all data
    console.log('📡 Fetching matches...');
    const matches = await Match.find({}).sort({ startTime: 1 });
    console.log(`✓ Found ${matches.length} matches`);

    console.log('📡 Fetching predictions...');
    const predictions = await Prediction.find({});
    console.log(`✓ Found ${predictions.length} predictions`);

    console.log('📡 Fetching users...');
    const users = await User.find({});
    console.log(`✓ Found ${users.length} users\n`);

    // Organize matches by group/stage
    const groups = {};
    const koMatches = [];

    for (const match of matches) {
      if (match.group.startsWith('Group')) {
        if (!groups[match.group]) groups[match.group] = [];
        groups[match.group].push(match);
      } else {
        koMatches.push(match);
      }
    }

    // Calculate prediction accuracy
    let correctPredictions = 0;
    let closePredictions = 0;
    const userStats = {};

    for (const pred of predictions) {
      const match = matches.find(m => m._id.toString() === pred.matchId.toString());
      if (!match) continue;

      const user = users.find(u => u._id.toString() === pred.userId.toString());
      if (!user) continue;

      if (!userStats[pred.userId.toString()]) {
        userStats[pred.userId.toString()] = {
          username: user.username,
          correct: 0,
          close: 0,
          total: 0,
          points: pred.points || 0
        };
      }

      userStats[pred.userId.toString()].total++;

      if (match.isFinished) {
        if (pred.predHome === match.resultHome && pred.predAway === match.resultAway) {
          userStats[pred.userId.toString()].correct++;
          correctPredictions++;
        } else if (
          (pred.predHome > pred.predAway && match.resultHome > match.resultAway) ||
          (pred.predHome < pred.predAway && match.resultHome < match.resultAway) ||
          (pred.predHome === pred.predAway && match.resultHome === match.resultAway)
        ) {
          userStats[pred.userId.toString()].close++;
          closePredictions++;
        }
      }
    }

    // Sort users by points
    const topUsers = Object.values(userStats)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    console.log('✅ Data processed\n');

    // Generate HTML
    const html = generateHTML(matches, groups, koMatches, topUsers, correctPredictions, closePredictions, predictions.length, users.length);

    // Write to file
    const outputPath = 'wc2026-report.html';
    fs.writeFileSync(outputPath, html);

    console.log('━'.repeat(70) + '\n');
    console.log('✅ REPORT GENERATED!\n');
    console.log(`📄 File: ${outputPath}\n`);
    console.log('Statistics:');
    console.log(`  Total Matches: ${matches.length}`);
    console.log(`  Finished Matches: ${matches.filter(m => m.isFinished).length}`);
    console.log(`  Total Predictions: ${predictions.length}`);
    console.log(`  Total Users: ${users.length}`);
    console.log(`  Correct Predictions: ${correctPredictions}`);
    console.log(`  Close Predictions: ${closePredictions}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

function generateHTML(matches, groups, koMatches, topUsers, correctPredictions, closePredictions, totalPredictions, totalUsers) {
  const groupStages = Object.keys(groups).sort();
  
  let groupsHTML = '';
  for (const group of groupStages) {
    const groupMatches = groups[group];
    groupsHTML += `
      <section class="stage-section">
        <h2 class="stage-title">${group}</h2>
        <div class="matches-grid">
          ${groupMatches.map(m => generateMatchCard(m)).join('')}
        </div>
      </section>
    `;
  }

  let koHTML = '';
  const stages = ['Round of 32', 'Quarter-final', 'Match for third place', 'Final'];
  for (const stage of stages) {
    const stageMatches = koMatches.filter(m => m.group === stage);
    if (stageMatches.length === 0) continue;
    
    koHTML += `
      <section class="stage-section ko-section">
        <h2 class="stage-title">${stage}</h2>
        <div class="matches-grid">
          ${stageMatches.map(m => generateMatchCard(m)).join('')}
        </div>
      </section>
    `;
  }

  const topUsersHTML = topUsers.map((user, idx) => `
    <tr>
      <td class="rank">${idx + 1}</td>
      <td class="username">${user.username}</td>
      <td class="stat">${user.correct}</td>
      <td class="stat">${user.close}</td>
      <td class="points">${user.points}</td>
    </tr>
  `).join('');

  const accuracyPercent = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
  const closePercent = totalPredictions > 0 ? Math.round((closePredictions / totalPredictions) * 100) : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Cup 2026 - Predictions Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --pitch-green: #0B5F3F;
      --pitch-light: #1a8c5c;
      --gold: #E8B547;
      --white: #FFFFFF;
      --dark: #1A1A1A;
      --gray: #F5F5F5;
      --error: #E74C3C;
      --success: #27AE60;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, var(--pitch-green) 0%, #0a4a32 100%);
      color: var(--dark);
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    /* Header */
    header {
      text-align: center;
      color: var(--white);
      margin-bottom: 60px;
      padding: 40px 0;
    }

    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }

    h1 {
      font-size: 42px;
      font-weight: 900;
      margin-bottom: 10px;
      letter-spacing: -1px;
    }

    .subtitle {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 300;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 60px;
    }

    .stat-card {
      background: var(--white);
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }

    .stat-value {
      font-size: 36px;
      font-weight: 900;
      color: var(--pitch-green);
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 13px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    /* Sections */
    .section {
      background: var(--white);
      border-radius: 8px;
      padding: 40px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .section-title {
      font-size: 28px;
      font-weight: 800;
      color: var(--pitch-green);
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 3px solid var(--gold);
      display: inline-block;
    }

    /* Match Card */
    .stage-section {
      margin-bottom: 40px;
    }

    .stage-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--pitch-green);
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .matches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
    }

    .match-card {
      background: linear-gradient(135deg, var(--pitch-green) 0%, var(--pitch-light) 100%);
      padding: 20px;
      border-radius: 6px;
      color: var(--white);
      border-left: 4px solid var(--gold);
    }

    .match-header {
      font-size: 11px;
      opacity: 0.8;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }

    .match-teams {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .team {
      flex: 1;
      text-align: center;
    }

    .team-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .score {
      font-size: 24px;
      font-weight: 900;
    }

    .vs {
      color: var(--gold);
      font-weight: 900;
      flex: 0.3;
    }

    .match-status {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.7;
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }

    .match-status.finished {
      color: var(--gold);
    }

    /* Top Users Table */
    .users-section {
      background: var(--white);
      border-radius: 8px;
      padding: 40px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table thead {
      background: var(--gray);
      border-bottom: 2px solid var(--gold);
    }

    .users-table th {
      padding: 15px;
      text-align: left;
      font-weight: 700;
      color: var(--pitch-green);
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    .users-table tbody tr {
      border-bottom: 1px solid #eee;
      transition: background 0.2s;
    }

    .users-table tbody tr:hover {
      background: var(--gray);
    }

    .users-table td {
      padding: 15px;
    }

    .rank {
      font-weight: 900;
      color: var(--pitch-green);
      font-size: 18px;
    }

    .username {
      font-weight: 600;
    }

    .stat {
      text-align: center;
      color: #666;
    }

    .points {
      font-weight: 800;
      color: var(--gold);
      font-size: 18px;
      text-align: center;
    }

    .ko-section {
      background: linear-gradient(135deg, rgba(11, 95, 63, 0.05) 0%, rgba(26, 140, 92, 0.05) 100%);
      border-left: 4px solid var(--gold);
    }

    @media (max-width: 768px) {
      h1 { font-size: 28px; }
      .matches-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: 1fr; }
      .section { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">⚽ 🏆</div>
      <h1>World Cup 2026</h1>
      <p class="subtitle">Tournament Results & Predictions Report</p>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${matches.length}</div>
        <div class="stat-label">Total Matches</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${matches.filter(m => m.isFinished).length}</div>
        <div class="stat-label">Finished</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalUsers}</div>
        <div class="stat-label">Predictors</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalPredictions}</div>
        <div class="stat-label">Predictions</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${accuracyPercent}%</div>
        <div class="stat-label">Exact Accuracy</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${closePercent}%</div>
        <div class="stat-label">Correct Result</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">GROUP STAGE</h2>
      ${groupsHTML}
    </div>

    <div class="section">
      <h2 class="section-title">KNOCKOUT STAGE</h2>
      ${koHTML}
    </div>

    <div class="users-section">
      <h2 class="section-title">TOP PREDICTORS</h2>
      <table class="users-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Exact ✓</th>
            <th>Result ✓</th>
            <th>Total Points</th>
          </tr>
        </thead>
        <tbody>
          ${topUsersHTML}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function generateMatchCard(match) {
  const status = match.isFinished ? 'Finished' : 'Scheduled';
  const statusClass = match.isFinished ? 'finished' : '';
  const result = match.isFinished 
    ? `${match.resultHome} - ${match.resultAway}`
    : '-';

  return `
    <div class="match-card">
      <div class="match-header">${match.group}</div>
      <div class="match-teams">
        <div class="team">
          <div class="team-name">${match.homeTeam}</div>
          <div class="score">${match.isFinished ? match.resultHome : '-'}</div>
        </div>
        <div class="vs">VS</div>
        <div class="team">
          <div class="team-name">${match.awayTeam}</div>
          <div class="score">${match.isFinished ? match.resultAway : '-'}</div>
        </div>
      </div>
      <div class="match-status ${statusClass}">${match.city}</div>
    </div>
  `;
}

connectDatabase().then(() => generateReport());
