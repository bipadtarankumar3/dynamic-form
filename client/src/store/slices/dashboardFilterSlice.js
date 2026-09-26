import { createSlice } from "@reduxjs/toolkit";

// Initial state
const initialState = {
  from_date: "",
  to_date: "",
};

// Slice
const dashboardFilterSlice = createSlice({
  name: "dashboardFilterSlice",
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
export const { setStateValue, resetInitialState } = dashboardFilterSlice.actions;
export default dashboardFilterSlice.reducer;
