import { api } from "./api";

// All notification calls are background/UI-chrome requests: failures are
// handled inline by the bell, so they never open the global error modal.
const quiet = { skipErrorModal: true };

// Newest first. `{ unreadOnly: true }` -> only unread.
export const getNotifications = async ({ unreadOnly = false, limit } = {}) => {
  const params = {};
  if (unreadOnly) params.unread = "true";
  if (limit) params.limit = limit;

  const res = await api.get("/notifications", { params, ...quiet });
  return res.data;
};

// -> { unread: number }
export const getUnreadCount = async () => {
  const res = await api.get("/notifications/unread-count", quiet);
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`, null, quiet);
  return res.data;
};

// -> { updated: number }
export const markAllNotificationsRead = async () => {
  const res = await api.patch("/notifications/read-all", null, quiet);
  return res.data;
};
