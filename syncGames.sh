#!/bin/bash
cd /mynode/football-worldcup
export PATH=/root/.nvm/versions/node/v20.13.1/bin:$PATH
node node_modules/.bin/tsx syncResults.js >> /mynode/games.log 2>&1
