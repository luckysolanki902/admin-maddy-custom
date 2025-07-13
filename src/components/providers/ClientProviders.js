"use client";

import { Provider as ReduxProvider } from "react-redux";
import store from "@/redux/store";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export default function ClientProviders({ children }) {
  return (
    <ReduxProvider store={store}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>{children}</LocalizationProvider>
    </ReduxProvider>
  );
}
