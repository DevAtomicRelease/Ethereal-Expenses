import { createSlice, PayloadAction } from "@reduxjs/toolkit";


const initialState = {
 recentTransactions: [] as any[],
 dailyTotal: 0,
};

const expenseSlice = createSlice({
 name: "expenses",
 initialState,
 reducers: {
 setRecent(state, action: PayloadAction<any[]>) {
 state.recentTransactions = action.payload;
 },
 addTransaction(state, action: PayloadAction<any>) {
 state.recentTransactions.unshift(action.payload);
 state.recentTransactions = state.recentTransactions.slice(0, 10);
 },
 setDailyTotal(state, action: PayloadAction<number>) {
 state.dailyTotal = action.payload;
 },
 },
});

export const { setRecent, addTransaction, setDailyTotal } = expenseSlice.actions;
export default expenseSlice.reducer;
