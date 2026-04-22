import { createSlice, PayloadAction } from "@reduxjs/toolkit";


const initialState = {
 notificationsEnabled: true,
 retentionDays: 90,
 currency: "INR",
};

const preferencesSlice = createSlice({
 name: "preferences",
 initialState,
 reducers: {
 setNotifications(state, action: PayloadAction<boolean>) {
 state.notificationsEnabled = action.payload;
 },
 setRetention(state, action: PayloadAction<number>) {
 state.retentionDays = action.payload;
 },
 },
});

export const { setNotifications, setRetention } = preferencesSlice.actions;
export default preferencesSlice.reducer;
