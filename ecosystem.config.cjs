module.exports = {
  apps: [
    {
      name: 'batch-job',
      script: 'batch-externalid.js',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      
      // Restart settings
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
       MONGODB_URI:"mongodb://localhost:27017/test",
       FOOTBALL_API_KEY:'770664b6b77e4a95a4f9372bd61dc9e0',
        COMPETITION_CODE: 'WC',
      },
      
      // Error and output logs
      error_file: './logs/batch-job-error.log',
      out_file: './logs/batch-job-out.log',
      log_file: './logs/batch-job-combined.log',
      time: true, // Add timestamp to logs
      
      // Advanced settings
      merge_logs: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};


nohup npx tsx batch-externalid.js > batch.log 2>&1 &


 db.matches.find({externalId: { $exists: false }})
 
[
  {
    _id: ObjectId('6a248abaf9c055e198d8c673'),
    homeTeam: 'South Africa',
    awayTeam: 'South Korea',
    group: 'Group A',
    city: 'Monterrey (Guadalupe)',
    startTime: ISODate('2026-06-25T01:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c679'),
    homeTeam: 'Bosnia & Herzegovina',
    awayTeam: 'Qatar',
    group: 'Group B',
    city: 'Seattle',
    startTime: ISODate('2026-06-24T19:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c67f'),
    homeTeam: 'Morocco',
    awayTeam: 'Haiti',
    group: 'Group C',
    city: 'Atlanta',
    startTime: ISODate('2026-06-24T22:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c685'),
    homeTeam: 'Paraguay',
    awayTeam: 'Australia',
    group: 'Group D',
    city: 'San Francisco Bay Area (Santa Clara)',
    startTime: ISODate('2026-06-26T02:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c68b'),
    homeTeam: 'Ecuador',
    awayTeam: 'Germany',
    group: 'Group E',
    city: 'New York/New Jersey (East Rutherford)',
    startTime: ISODate('2026-06-25T20:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c691'),
    homeTeam: 'Tunisia',
    awayTeam: 'Netherlands',
    group: 'Group F',
    city: 'Kansas City',
    startTime: ISODate('2026-06-25T23:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c697'),
    homeTeam: 'New Zealand',
    awayTeam: 'Belgium',
    group: 'Group G',
    city: 'Vancouver',
    startTime: ISODate('2026-06-27T03:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c69d'),
    homeTeam: 'Uruguay',
    awayTeam: 'Spain',
    group: 'Group H',
    city: 'Guadalajara (Zapopan)',
    startTime: ISODate('2026-06-27T00:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c6a3'),
    homeTeam: 'Senegal',
    awayTeam: 'Iraq',
    group: 'Group I',
    city: 'Toronto',
    startTime: ISODate('2026-06-26T19:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c6a9'),
    homeTeam: 'Jordan',
    awayTeam: 'Argentina',
    group: 'Group J',
    city: 'Dallas (Arlington)',
    startTime: ISODate('2026-06-28T02:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c6af'),
    homeTeam: 'DR Congo',
    awayTeam: 'Uzbekistan',
    group: 'Group K',
    city: 'Atlanta',
    startTime: ISODate('2026-06-27T23:30:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  },
  {
    _id: ObjectId('6a248abaf9c055e198d8c6b5'),
    homeTeam: 'Croatia',
    awayTeam: 'Ghana',
    group: 'Group L',
    city: 'Philadelphia',
    startTime: ISODate('2026-06-27T21:00:00.000Z'),
    isFinished: false,
    resultHome: null,
    resultAway: null,
    __v: 0
  }
]
