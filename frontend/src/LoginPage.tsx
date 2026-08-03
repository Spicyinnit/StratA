import { useState } from 'react';
import { Box, Card, TextField, Button, Typography, Alert, Link } from '@mui/material';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit() {
    setError('');
    if (!username || !password || (isRegister && !password2)) {
      setError('Fill all fields');
      return;
    }
    setLoading(true);
    try {
      if (isRegister) await register(username, password, password2);
      else await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? 'login' : 'register');
    setError('');
    setPassword('');
    setPassword2('');
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
          onKeyDown={(e) => e.key === 'Enter' && !isRegister && handleSubmit()}
        />
        {isRegister && (
          <TextField
            label="Confirm password"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        )}

        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Working...' : isRegister ? 'Sign up' : 'Log in'}
        </Button>

        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={switchMode}
          sx={{ fontSize: 14 }}
        >
          {isRegister ? 'Already have an account? Log in' : 'First time? Sign up'}
        </Link>
      </Card>
    </Box>
  );
}