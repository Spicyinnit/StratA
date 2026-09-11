import { useState } from 'react';
import { Box, Card, TextField, Button, Typography, Alert, Link,IconButton, InputAdornment, } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useUserSession } from '../UserSession';
import { useAppTheme } from '../Theme';
import { WALLPAPERS } from '../wallpapers';

export default function LoginPage() {
  const { login, register } = useUserSession();
  const { mode } = useAppTheme();
  const paper = WALLPAPERS.arrows[mode];
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isRegister = tab === 'register';

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
    setTab(isRegister ? 'login' : 'register');
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
        minHeight: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: mode === 'dark' ? '#14100E' : '#E8DDC8',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${paper})`,
          backgroundRepeat: 'repeat',
          backgroundSize: 1750,
          opacity: mode === 'dark' ? 0.12 : 0.28,
          pointerEvents: 'none',
        }}/>
      <Card
        sx={{
          p: 4,
          width: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          background: '#FAF3E1',
          borderRadius: 4,
          position: 'relative',
          zIndex: 1,
          border: `1px solid ${mode === 'dark' ? '#d8cba8' : '#C2410C'}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#C9B896' },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8a7854' },
          '& .MuiInputLabel-root': { color: '#8a7854' },
          '& .MuiOutlinedInput-input': { color: '#222222' },
          '& .MuiIconButton-root': { color: '#8a7854' },
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
            Strata<Box component="span"
            sx={{ color: '#FF6D1F' }}>.</Box>
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
          type={showPw ? 'text' : 'password'}
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isRegister && handleSubmit()}
          slotProps={{
            input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPw(!showPw)}
                >
                  {showPw ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
            },
          }}
        />
        {isRegister && (
          <TextField
            label="Confirm password"
            type={showPw ? 'text' : 'password'}
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