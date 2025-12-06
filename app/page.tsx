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

import {
  Container, Typography, Box, Paper, Chip,
  Accordion, AccordionSummary, AccordionDetails,
  Card, CardContent, Divider, Avatar, Button,
  Grid
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: 'center', px: 2 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
          <SportsSoccerIcon sx={{ fontSize: { xs: 60, md: 80 }, color: '#1976d2', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            World Cup Predictor
          </Typography>
          <Typography color="text.secondary" paragraph sx={{ mb: 4 }}>
            Join the competition, predict match scores, and climb the global leaderboard!
          </Typography>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <Button variant="contained" size="large" fullWidth>
              Login to Play
            </Button>
          </Link>
        </Paper>
      </Container>
    );
  }

  await connectDB();

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

  return (
    <Container maxWidth="lg" sx={{ py: 2, px: { xs: 1, sm: 2 } }}>

      {/* HEADER */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <SportsSoccerIcon color="primary" sx={{ fontSize: { xs: 32, md: 44 } }} />
          <Typography variant="h4" fontWeight="800" color="#333" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            WC Predictor
          </Typography>
        </Box>

        <Paper elevation={2} sx={{ p: 1, px: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff', borderRadius: 4, width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: '#1976d2', fontWeight: 'bold', fontSize: 14 }}>
              {session.user.name?.substring(0, 1).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" lineHeight={1.2}>
                {session.user.name}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Total: <span style={{ fontWeight: 'bold', color: '#1976d2' }}>{currentUser?.totalPoints || 0} pts</span>
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center">
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <LogoutButton />
          </Box>
        </Paper>
      </Box>

      <Grid container spacing={2}>

        {/* MATCHES COLUMN */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            📅 Matches
          </Typography>

          {Object.keys(groups).sort().map((groupName) => {
            const groupMatches = groups[groupName];
            const teamList = getTeamNames(groupMatches);

            return (
              <Accordion key={groupName} sx={{ mb: 1.5, border: '1px solid #e0e0e0', boxShadow: 'none', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#fff', px: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle1" color="primary" fontWeight="bold">
                      Group {groupName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {teamList}
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ bgcolor: '#fafafa', p: { xs: 0.5, sm: 2 } }}>
                  <Grid container spacing={1}>
                    {groupMatches.map((match: any) => {
                      const pred = predsMap.get(match._id.toString());
                      const matchDate = new Date(match.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                      return (
                        <Grid size={{ xs: 12 }} key={match._id}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.5,
                              border: '1px solid #eee',
                              display: 'flex',
                              flexDirection: { xs: 'column', sm: 'row' }, // Stack on mobile
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: { xs: 1.5, sm: 0 } // Add gap between elements on mobile
                            }}
                          >

                            {/* HOME TEAM */}
                            <Box sx={{ flex: 1, width: '100%', display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                              {/* align="right" means Text-Flag on Desktop, but thanks to our new component, it's Flag-Text on Mobile! */}
                              <TeamWithFlag teamName={match.homeTeam} align="right" />
                            </Box>

                            {/* CENTER: INPUT/SCORE */}
                            <Box sx={{
                              mx: { xs: 0, sm: 2 },
                              textAlign: 'center',
                              minWidth: { xs: '100%', sm: 120 }, // Full width on mobile to separate teams
                              bgcolor: { xs: '#f5f5f5', sm: 'transparent' }, // Slight background on mobile to distinguish
                              borderRadius: 1,
                              py: { xs: 1, sm: 0 }
                            }}>
                              <Typography variant="caption" display="block" color="text.secondary" gutterBottom sx={{ fontSize: 10 }}>
                                {matchDate}
                              </Typography>

                              {match.isFinished ? (
                                <Box>
                                  <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#333' }}>
                                    {match.resultHome} - {match.resultAway}
                                  </Typography>
                                  <Chip label={`+${pred ? pred.points : 0}`} color={pred?.points > 0 ? "success" : "default"} size="small" variant="filled" sx={{ height: 20, fontSize: 10 }} />
                                </Box>
                              ) : (
                                <PredictFormMUI matchId={match._id.toString()} initialHome={pred?.predHome} initialAway={pred?.predAway} />
                              )}
                            </Box>

                            {/* AWAY TEAM */}
                            <Box sx={{ flex: 1, width: '100%', display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                              <TeamWithFlag teamName={match.awayTeam} align="left" />
                            </Box>

                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Grid>

        {/* LEADERBOARD */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <EmojiEventsIcon sx={{ color: '#ffb300', fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">Leaderboard</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {users.map((user: any, index: number) => (
                  <Box key={user._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, mb: 1, borderRadius: 1, bgcolor: index < 3 ? '#fff8e1' : 'transparent', borderLeft: index < 3 ? '4px solid #ffb300' : '4px solid transparent' }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Typography fontWeight="bold" color="text.secondary" sx={{ width: 20, textAlign: 'center', fontSize: 13 }}>{index + 1}</Typography>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: index === 0 ? '#ffb300' : (index === 1 ? '#9e9e9e' : (index === 2 ? '#cd7f32' : '#e0e0e0')), fontSize: 12, fontWeight: 'bold' }}>{user.username.substring(0, 2).toUpperCase()}</Avatar>
                      <Typography fontWeight="600" fontSize={13} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120, whiteSpace: 'nowrap' }}>{user.username}</Typography>
                    </Box>
                    <Typography fontWeight="bold" color="primary" fontSize={14}>{user.totalPoints} pts</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Container>
  );
}