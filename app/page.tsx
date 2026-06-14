export const dynamic = 'force-dynamic';

import { connectDB } from "@/lib/db";
import Match from "@/models/Match";
import Prediction from "@/models/Prediction";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import PredictFormMUI from "@/components/PredictFormMUI";
import LogoutButton from "@/components/LogoutButton";
import TeamWithFlag from "@/components/TeamWithFlag";
import LocalTime from "@/components/LocalTime";

import {
  Container, Typography, Box, Paper, Chip,
  Accordion, AccordionSummary, AccordionDetails,
  Avatar, Button, Divider, Card, CardContent, Alert, Stack
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // 1. GUEST VIEW
  if (!session || !session.user || !session.user.id) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center', px: 2 }}>
        <Paper elevation={0} sx={{ p: 5, borderRadius: '24px', border: '1px solid #e0e0e0' }}>
          <SportsSoccerIcon sx={{ fontSize: 80, color: '#007AFF', mb: 2 }} />
          <Typography variant="h4" fontWeight="800" gutterBottom>World Cup 2026</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>Predict results and win the tournament!</Typography>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button variant="contained" size="large" fullWidth sx={{ borderRadius: '12px', py: 2, fontWeight: 'bold', textTransform: 'none' }}>
              Login to Start
            </Button>
          </Link>
        </Paper>
      </Container>
    );
  }

  await connectDB();

  // 2. DATA FETCHING
  const matches = await Match.find({}).sort({ startTime: 1 });
  const myPredictions = await Prediction.find({ userId: session.user.id });
  const users = await User.find({}).sort({ totalPoints: -1 });

  const predsMap = new Map(myPredictions.map((p: any) => [p.matchId.toString(), p]));

  const groups: Record<string, any[]> = {};
  matches.forEach((m: any) => {
    if (!groups[m.group]) groups[m.group] = [];
    groups[m.group].push(m);
  });

  const getTeamNames = (groupMatches: any[]) => {
    const teams = new Set();
    groupMatches.forEach(m => {
      teams.add(m.homeTeam);
      teams.add(m.awayTeam);
    });
    return Array.from(teams).join(', ');
  };

  const currentUser = users.find((u: any) => u._id.toString() === session.user.id);

  // Lockdown comparison variables
  const now = Date.now();
  const oneHourInMs = 60 * 60 * 1000;

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        py: 2, 
        px: { xs: 0.5, sm: 2 }, 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* HEADER */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <img src="/worldcup/medlar.png" alt="Logo" style={{ width: 40, height: 40 }} />
          <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: '-1px' }}>WC PREDICTOR</Typography>
        </Box>

        <Paper elevation={0} sx={{ p: 1, px: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f2f2f7', borderRadius: '40px' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: '#007AFF', fontSize: 11 }}>{session.user.name?.charAt(0)}</Avatar>
            <Typography variant="subtitle2" fontWeight="800">{currentUser?.totalPoints || 0} pts</Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <LogoutButton />
        </Paper>
      </Box>

      {/* RULE ALERT */}
      <Alert icon={<AccessTimeIcon fontSize="small" />} severity="info" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600, fontSize: { xs: 10, sm: 13 } }}>
        Predictions lock 1 hour before kickoff. Only positive scores allowed.
      </Alert>

      {/* CONTENT */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 68%' } }}>
          {Object.keys(groups).sort().map((groupName) => {
            const groupMatches = groups[groupName];
            return (
              <Accordion 
                key={groupName} 
                sx={{ mb: 1.5, borderRadius: '16px !important', boxShadow: 'none', border: '1px solid #e5e5ea', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="800" color="#007AFF">{groupName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block' }}>
                        {getTeamNames(groupMatches)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: { xs: 0.5, sm: 2 }, bgcolor: '#f9f9f9' }}>
                  <Stack spacing={1}>
                    {groupMatches.map((match: any) => {
                      const pred = predsMap.get(match._id.toString());
                      
                      // TIME LOGIC
                      const matchTime = new Date(match.startTime).getTime();
                      const isLocked = now > (matchTime - oneHourInMs);
                      const utcStr = new Date(match.startTime).toISOString().replace('T', ' ').substring(0, 16);

                      return (
                        <Paper
                          key={match._id}
                          elevation={0}
                          sx={{
                            p: { xs: 1, sm: 2 },
                            borderRadius: '12px',
                            border: '1px solid #efeff4',
                            display: 'flex',
                            flexDirection: 'row', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: '#fff',
                            gap: 0.5
                          }}
                        >
                          {/* HOME TEAM */}
                          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                            <TeamWithFlag teamName={match.homeTeam} align="right" />
                          </Box>

                          {/* CENTER SECTION */}
                          <Box sx={{ width: { xs: 110, sm: 180 }, textAlign: 'center', flexShrink: 0 }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ color: '#FF3B30', fontSize: { xs: 8, sm: 10 }, display: 'block' }}>
                              📍 {match.city?.split(' ')[0] || match.ground?.split(' ')[0]}
                            </Typography>
                            
                            <LocalTime date={match.startTime} />
                            
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: 7, sm: 9 }, display: 'block' }}>
                              UTC: {utcStr}
                            </Typography>

                            <Box sx={{ mt: 0.5 }}>
                              {match.isFinished ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <Typography variant="subtitle1" fontWeight="900" sx={{ fontSize: { xs: 16, sm: 22 }, lineHeight: 1 }}>
                                    {match.resultHome} - {match.resultAway}
                                  </Typography>
                                  <Typography sx={{ fontSize: { xs: 8, sm: 11 }, color: 'text.secondary', fontWeight: 500 }}>
                                    Your Pick: {pred ? `${pred.predHome}-${pred.predAway}` : 'None'}
                                  </Typography>
                                  <Chip label={`+${pred ? pred.points : 0} pts`} color={pred?.points > 0 ? "success" : "default"} size="small" sx={{ height: 16, fontSize: 8, mt: 0.5 }} />
                                </Box>
                              ) : isLocked ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                    <Chip icon={<LockIcon style={{ fontSize: 10 }} />} label="Locked" color="error" variant="outlined" size="small" sx={{ height: 18, fontSize: 9, fontWeight: 'bold' }} />
                                    {pred && (
                                        <Typography sx={{ fontSize: 10, fontWeight: 'bold', color: '#666' }}>
                                            Your Pick: {pred.predHome}-{pred.predAway}
                                        </Typography>
                                    )}
                                </Box>
                              ) : (
                                <PredictFormMUI 
                                  matchId={match._id.toString()} 
                                  initialHome={pred?.predHome} 
                                  initialAway={pred?.predAway} 
                                />
                              )}
                            </Box>
                          </Box>

                          {/* AWAY TEAM */}
                          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                            <TeamWithFlag teamName={match.awayTeam} align="left" />
                          </Box>
                        </Paper>
                      );
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>

        {/* RANKING */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 30%' } }}>
          <Card elevation={0} sx={{ borderRadius: '24px', border: '1px solid #e5e5ea', position: { md: 'sticky' }, top: 20 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <EmojiEventsIcon sx={{ color: '#FFD60A' }} />
                <Typography variant="h6" fontWeight="900">Ranking</Typography>
              </Box>
              <Box sx={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {users.map((user: any, index: number) => (
                  <Box 
                    key={user._id} 
                    sx={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, mb: 1, borderRadius: '12px',
                      bgcolor: user._id.toString() === session.user.id ? '#F2F2F7' : 'transparent',
                      border: user._id.toString() === session.user.id ? '1px solid #007AFF' : 'none'
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ width: 15 }}>{index + 1}</Typography>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: index === 0 ? '#FFD60A' : '#E5E5EA', color: '#000' }}>
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" fontWeight="700" sx={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="900" color="#007AFF">{user.totalPoints} pts</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}