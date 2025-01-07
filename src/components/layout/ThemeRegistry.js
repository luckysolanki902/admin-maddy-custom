'use client';
import { lightTheme, darkTheme } from '@/styles/theme';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useMediaQuery } from '@mui/material';


const ThemeRegistry = ({ children }) => {
  const prefersLightMode = useMediaQuery('(prefers-color-scheme: light)');
  const theme = prefersLightMode ? lightTheme : darkTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* This ensures MUI's baseline styles are applied */}
      {children}
    </ThemeProvider>
  );
};

export default ThemeRegistry;
