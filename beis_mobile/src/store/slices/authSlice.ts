import { createSlice, PayloadAction } from "@reduxjs/toolkit";


const initialState = {
 isAuthenticated: false,
 userId: null as string | null,
 email: null as string | null,
};

const authSlice = createSlice({
 name: "auth",
 initialState,
 reducers: {
 setAuthenticated(state, action: PayloadAction<{ userId: string; email: string }>) {
 state.isAuthenticated = true;
 state.userId = action.payload.userId;
 state.email = action.payload.email;
 },
 logout(state) {
 state.isAuthenticated = false;
 state.userId = null;
 state.email = null;
 },
 },
});

export const { setAuthenticated, logout } = authSlice.actions;
export default authSlice.reducer;
