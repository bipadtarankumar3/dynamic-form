import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  deleteNotificationApi,
  getNotificationListApi,
  markNotificationAsReadApi,
} from "@/services/notification-service";

// Initial state
const initialState = {
  notifications: [],
  loading: true,
  error: null,
};

// Thunk to fetch notifications
export const fetchNotifications = createAsyncThunk(
  "NotificationSlice/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getNotificationListApi();
      return response?.data?.data || [];
    } catch (err) {
      return rejectWithValue(err.message || "Unknown error");
    }
  }
);

// Thunk to mark notifications as read
export const markNotificationAsRead = createAsyncThunk(
  "NotificationSlice/markNotificationAsRead",
  async (notificationIds, { rejectWithValue }) => {
    try {
      const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
      await markNotificationAsReadApi(ids);
      return ids;
    } catch (err) {
      return rejectWithValue(err.message || "Unknown error");
    }
  }
);

// Thunk to delete a notification
export const deleteNotification = createAsyncThunk(
  "NotificationSlice/deleteNotification",
  async (notificationId, { rejectWithValue }) => {
    try {
      await deleteNotificationApi(notificationId);
      return notificationId;
    } catch (err) {
      return rejectWithValue(err.message || "Unknown error");
    }
  }
);

// Slice
const NotificationSlice = createSlice({
  name: "NotificationSlice",
  initialState,
  reducers: {
    setNotification(state, action) {
      state.notifications = action.payload;
    },
    resetInitialState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload;
        state.loading = false;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch notifications.";
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const markedIds = action.payload || [];
        state.notifications = state.notifications.map((n) =>
          markedIds.includes(n?.tntf_id) || markedIds.includes(n?.id)
            ? { ...n, tntf_is_read: true, is_read: true }
            : n
        );
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(
          (notification) =>
            notification?.tntf_id !== action.payload
        );
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload || "Failed to delete notification.";
      });
  },
});

// Exports
export const { setNotification, resetInitialState } = NotificationSlice.actions;
export default NotificationSlice.reducer;
