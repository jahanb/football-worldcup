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
        FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY,
        MONGODB_URI: process.env.MONGODB_URI,
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