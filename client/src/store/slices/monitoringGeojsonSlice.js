import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { privateHttpClient } from "@/services/api/httpClient";
import apiUrlMap from "@/modules/dashboard/monitoringApiUrlMap";

const initialState = {
  type: "",
  monitoringGeojson: [],
  error: null,
  loading: false,
};

export const fetcheMonitoringGeojson = createAsyncThunk(
  "monitoringGeojsonSlice/fetcheMonitoringGeojson",
  async (params, { rejectWithValue }) => {
    try {
      const response = await privateHttpClient.post(
        `/dash/${apiUrlMap[params.type]}`,
        params,
      );
      
      return response?.data || [];
    } catch (err) {
      return rejectWithValue(err.message || "Unknown error");
    }
  },
);

const monitoringGeojsonSlice = createSlice({
  name: "monitoringGeojsonSlice",
  initialState,
  reducers: {
    setInitialStateValue(state, action) {
      const { key, value } = action.payload;
      state[key] = value;
    },
    resetInitialState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetcheMonitoringGeojson.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetcheMonitoringGeojson.fulfilled, (state, action) => {
        state.monitoringGeojson = action.payload;
        state.loading = false;
      })
      .addCase(fetcheMonitoringGeojson.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch monitoring.";
      });
  },
});

export const { setInitialStateValue, resetInitialState } =
  monitoringGeojsonSlice.actions;

export default monitoringGeojsonSlice.reducer;
