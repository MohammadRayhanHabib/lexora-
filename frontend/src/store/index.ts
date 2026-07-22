import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import testReducer from "./slices/testSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tests: testReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
