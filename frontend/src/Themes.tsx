import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material';
import type { WallpaperKey } from './wallpapers';

type Mode = 'light' | 'dark';

const Ctx = createContext<{
  mode: Mode;
  setMode: (m: Mode) => void;
  wallpaper: WallpaperKey;
  setWallpaper: (w: WallpaperKey) => void;
}>(null!);

export const useAppTheme = () => useContext(Ctx);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(
    () => (localStorage.getItem('mode') as Mode) || 'light'
  );
  const [wallpaper, setWallpaperState] = useState<WallpaperKey>(
    () => (localStorage.getItem('wallpaper') as WallpaperKey) || 'none'
  );

  const setMode = (m: Mode) => { localStorage.setItem('mode', m); setModeState(m); };
  const setWallpaper = (w: WallpaperKey) => { localStorage.setItem('wallpaper', w); setWallpaperState(w); };

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#FF6D1F' },
      ...(mode === 'light'
        ? {
            background: { default: '#FAF3E1', paper: '#FAF3E1' },
            text: { primary: '#222222', secondary: '#8a7854' },
          }
        : {
            background: { default: '#222222', paper: '#2C2C2C' },
            text: { primary: '#FAF3E1', secondary: '#9a9a9a' },
          }),
    },
    typography: { fontFamily: '"Inter", system-ui, sans-serif' },
    shape: { borderRadius: 10 },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { border: `1px solid ${mode === 'light' ? '#d8cba8' : '#3a3a3a'}` },
        },
      },
    },
  }), [mode]);

  return (
    <Ctx.Provider value={{ mode, setMode, wallpaper, setWallpaper }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </Ctx.Provider>
  );
}