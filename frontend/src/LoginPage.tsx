import { useState } from 'react';
import { Box, Card, TextField, Button, Typography, Alert } from '@mui/material';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!username || !password) {
      setError('Fill both fields');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Card sx={{ p: 4, width: 320, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">Strata</Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </Button>
      </Card>
    </Box>
  );
}