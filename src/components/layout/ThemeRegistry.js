'use client';
import { lightTheme, darkTheme } from '@/styles/theme';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useMediaQuery } from '@mui/material';


const ThemeRegistry = ({ children }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = prefersDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* This ensures MUI's baseline styles are applied */}
      {children}
    </ThemeProvider>
  );
};

export default ThemeRegistry;
