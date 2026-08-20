import arrowsDark from './assets/wallpapers/Arrowsdark.jpg';
import arrowsLight from './assets/wallpapers/arrowslight.jpg';

export const WALLPAPERS = {
  none:   { label: 'None',   dark: null,       light: null },
  arrows: { label: 'Arrows', dark: arrowsDark, light: arrowsLight },
} as const;

export type WallpaperKey = keyof typeof WALLPAPERS;