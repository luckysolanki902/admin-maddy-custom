import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import siteUpdatesReducer from "./slices/siteUpdatesSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    siteUpdates: siteUpdatesReducer,
  },
});

export default store;
