## Getting Started

First, run the development server:

```bash

npm install

npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

npm run build
npm run start

mongoexport --uri="mongodb://localhost:27017" --db=test --collection=matches --out=matches.json
use this url to access the app
for change the games http://localhost:3011/worldcup/admin
for define the new user and login http://localhost:3011/worldcup/login

login and predict matches
```
.env 
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/test
FOOTBALL_API_KEY=770664b6b77e4a95a4f9372bd61dc9e0
#
NEXTAUTH_URL=http://localhost:3011/worldcup
NEXTAUTH_SECRET=24fce6ba353792bc0c07db8dc275387257ebe832f7ef26e2dee6ec5ecd0dd9e6

World Cup Predictor application with:
✅ User Authentication (Login/Register)
✅ Responsive Design (Works perfectly on Mobile & Desktop)
✅ Admin Dashboard (To set scores and calculate points)
✅ Automatic Scoring Logic (Calculates 1, 2, or 5 points based on rules)
✅ Leaderboard (Updates in real-time)
✅ Team Flags (Even for Scotland/England!)
