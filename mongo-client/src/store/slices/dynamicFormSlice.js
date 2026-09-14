import { createSlice } from "@reduxjs/toolkit";

// Initial state
const initialState = {
  r_selected_data: {},
  r_form_slug: null,
};

// Slice
const DynamicFormSlice = createSlice({
  name: "DynamicFormSlice",
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
export const { setStateValue, resetInitialState } = DynamicFormSlice.actions;
export default DynamicFormSlice.reducer;
