'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Skeleton,
} from '@mui/material';

export default function RecentCommits() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const res = await fetch('/api/admin/github/getcommits');
        if (!res.ok) {
          throw new Error('Request failed');
        }
        const json = await res.json();
        if (json.error) {
          throw new Error(json.error);
        }
        setData(json);
      } catch (error) {
        console.error(error);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  if (hasError) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ width: '100%', mt: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="body1">Couldn&apos;t fetch commits</Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  if (loading) {
    // Just show skeletons for the two repos
    return (
      <Container maxWidth="lg"  sx={{ mt: 4 }}>
        <Box>
          <Typography variant="h4">
            <Skeleton variant="text" width="40%" />
          </Typography>
        </Box>
        <Box sx={{ width: '100%', mt: 4 }}>
          {[1, 2].map((repoIndex) => (
            <Card key={repoIndex} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">
                  <Skeleton variant="text" width="40%" />
                </Typography>
                <List>
                  {[...Array(5)].map((_, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={<Skeleton variant="text" width="80%" />}
                        secondary={<Skeleton variant="text" width="40%" />}
                      />
                    </ListItem>
                  ))}
                </List>
                <Typography variant="subtitle2">Branches:</Typography>
                {[...Array(3)].map((_, index) => (
                  <Skeleton key={index} variant="text" width="50%" />
                ))}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box>
          <Typography variant="h4">Recent site updates</Typography>
        </Box>
      <Box sx={{ width: '100%', mt: 4 }}>
        {data.map(({ repo, commits, branches }) => (
          <Card key={repo} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {repo}
              </Typography>

              {/* Commits */}
              <List>
                {commits.map((c) => (
                  <ListItem key={c.sha} divider>
                    <ListItemText
                      primary={c.message}
                      secondary={dayjs(c.date).format('MMM D, YYYY h:mm A')}
                    />
                  </ListItem>
                ))}
              </List>

              {/* Branches */}
              <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Recent Feature Branches:
              </Typography>
              {branches.length > 0 ? (
                branches.map((branch) => (
                  <Typography key={branch} variant="body2">
                    {branch}
                  </Typography>
                ))
              ) : (
                <Typography variant="body2">No feature branches found.</Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
}
