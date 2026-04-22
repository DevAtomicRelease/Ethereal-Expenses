import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import { asyncStoragePersist } from "./persist";
import authReducer from "./slices/authSlice";
import expenseReducer from "./slices/expenseSlice";
import preferencesReducer from "./slices/preferencesSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  expenses: expenseReducer,
  preferences: preferencesReducer,
});

const persistedReducer = persistReducer(
  { key: "beis_root", storage: asyncStoragePersist, whitelist: ["auth", "preferences"] },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (gDM) => gDM({ serializableCheck: false }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
