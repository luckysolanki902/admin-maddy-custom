import { createTheme } from '@mui/material/styles';

const lightTheme = createTheme({
  typography: {
    fontFamily: 'Jost, Arial',
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#000000', // Example primary color for light mode
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
    text: {
      primary: '#000000',
      secondary: '#555555',
    },
  },
});

const darkTheme = createTheme({
  typography: {
    fontFamily: 'Jost, Arial',
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffffff', 
    },
    background: {
      default: '#1D1D1D',
      paper: '#2C2C2C',
    },
    text: {
      primary: '#ededed',
      secondary: '#aaaaaa',
    },
  },
});

export { lightTheme, darkTheme };
