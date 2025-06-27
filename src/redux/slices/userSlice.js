import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  email: "",
  role: "",
  department: "",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (_state, { payload }) => ({
      email: payload.email,
      role: payload.role,
      department: payload.department,
    }),
    clearUser: () => initialState,
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
