import { combineReducers, configureStore } from "@reduxjs/toolkit";
import NotificationSlice from "./slices/NotificationSlice";
import DynamicFormSlice from "./slices/dynamicFormSlice";
import BudgetTransferFilterSlice from "./slices/budgetTransferFilterSlice";
import monitoringGeojsonSlice from "./slices/monitoringGeojsonSlice";
import dashboardFilterSlice from "./slices/dashboardFilterSlice";
// Combine all reducers
const rootReducer = combineReducers({
  NotificationSlice: NotificationSlice,
  DynamicFormSlice: DynamicFormSlice,
  budgetTransferFilterSlice: BudgetTransferFilterSlice,
  monitoringGeojsonSlice: monitoringGeojsonSlice,
  dashboardFilterSlice: dashboardFilterSlice,
});
// Define a reducer proxy to handle state reset
export const reducerProxy = (state, action) => {
  if (action.type === "LOGOUT") {
    return rootReducer(undefined, action); // Reset state to initial state
  }
  return rootReducer(state, action); // Forward action to root reducer
};

// Configure the Redux store
export const store = configureStore({
  reducer: reducerProxy, // Use the reducer proxy
  devTools: true, // Enable Redux DevTools
});
