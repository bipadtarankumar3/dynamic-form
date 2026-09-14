import { createSlice } from "@reduxjs/toolkit";

// Initial state
const initialState = {
  tbtr_from_fy_id: "",
  tbtr_to_fy_id: "",
  tbtr_from_theme_id: "",
  tbtr_to_theme_id: "",
  tbtr_from_activity_id: "",
  tbtr_to_activity_id: "",
};

// Slice
const budgetTransferFilterSlice = createSlice({
  name: "budgetTransferFilterSlice",
  initialState,
  reducers: {
    setStateValue(state, action) {
      state[action.payload.key] = action.payload.value;
    },
    resetInitialState() {
      return initialState;
    },
  },
});

// Exports
export const { setStateValue, resetInitialState } = budgetTransferFilterSlice.actions;
export default budgetTransferFilterSlice.reducer;
