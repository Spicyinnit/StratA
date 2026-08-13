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
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#222222',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <Card
        sx={{
          p: 4,
          width: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          background: '#FAF3E1',
          borderRadius: 4,
          border: '1px solid #d8cba8',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}
      >
        <Box sx={{ mb: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#222222',
              lineHeight: 1.1,
            }}
          >
            Strata<Box component="span" sx={{ color: '#FF6D1F' }}>.</Box>
          </Typography>
          <Typography sx={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 14, color: '#8a7854', mt: 0.5 }}>
            {isRegister ? 'Create your account' : 'Welcome back'}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ fontFamily: '"Inter", system-ui, sans-serif' }}>{error}</Alert>}

        <TextField
          label="Username"
          size="small"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isRegister && handleSubmit()}
        />
        <TextField
          label="Password"
          type="password"
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isRegister && handleSubmit()}
        />
        {isRegister && (
          <TextField
            label="Confirm password"
            type="password"
            size="small"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          disableElevation
          sx={{
            fontFamily: '"Inter", system-ui, sans-serif',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 15,
            py: 1.2,
            borderRadius: 2,
            mt: 0.5,
          }}
        >
          {loading ? 'Working...' : isRegister ? 'Sign up' : 'Log in'}
        </Button>

        <Link
          component="button"
          type="button"
          underline="hover"
          onClick={switchMode}
          sx={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 13.5,
            color: '#8a7854',
            alignSelf: 'center',
            '&:hover': { color: '#FF6D1F' },
          }}
        >
          {isRegister ? 'Already have an account? Log in' : 'First time? Sign up'}
        </Link>
      </Card>
    </Box>
  );
}