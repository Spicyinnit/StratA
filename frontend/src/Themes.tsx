import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material';
import type { WallpaperKey } from './wallpapers';

type Mode = 'light' | 'dark';

const Ctx = createContext<{
  mode: Mode;
  setMode: (m: Mode) => void;
  wallpaper: WallpaperKey;
  setWallpaper: (w: WallpaperKey) => void;
  wallpaperPos: string;
  randomizeWallpaper: () => void;
}>(null!);

export const useAppTheme = () => useContext(Ctx);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>(
    () => (localStorage.getItem('mode') as Mode) || 'light'
  );
  const [wallpaper, setWallpaperState] = useState<WallpaperKey>(
    () => (localStorage.getItem('wallpaper') as WallpaperKey) || 'none'
  );
  const [wallpaperPos, setWallpaperPos] = useState<string>(
    () => localStorage.getItem('wallpaperPos') || '0px 0px'
  );

  const setMode = (m: Mode) => { localStorage.setItem('mode', m); setModeState(m); };
  const setWallpaper = (w: WallpaperKey) => { localStorage.setItem('wallpaper', w); setWallpaperState(w); };

  const randomizeWallpaper = () => {
    const p = `${Math.floor(Math.random() * 600)}px ${Math.floor(Math.random() * 600)}px`;
    localStorage.setItem('wallpaperPos', p);
    setWallpaperPos(p);
  };

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
//                                     favicon changer v (public folder)
  useEffect(() => {
    const href = mode === 'dark' ? '/favicon-dark.svg' : '/favicon.svg';
    const old = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    const next = document.createElement('link');
    next.rel = 'icon';
    next.type = 'image/svg+xml';
    next.href = href;
    old?.remove();
    document.head.appendChild(next);
  }, [mode]);

  return (
    <Ctx.Provider value={{ mode, setMode, wallpaper, setWallpaper, wallpaperPos, randomizeWallpaper }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </Ctx.Provider>
  );
}