import axios from "axios";
import { showGlobalError } from "../context/errorModalBridge";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // baseURL: import.meta.env.VITE_API_RENDER,
});

// Global safety net: pop the error modal for any failed request, showing
// whatever message the backend sent back. Pages can still keep their own
// local try/catch + toast on top of this (e.g. to disable a button while
// saving) — this just guarantees nothing fails completely silently.
//
// To opt a specific call out (e.g. a background fetch where a 404 is a
// normal, expected outcome and shouldn't interrupt the user), pass
// `{ skipErrorModal: true }` in that call's axios config.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.config?.skipErrorModal) {
      const status = error.response?.status;
      const data = error.response?.data;

      showGlobalError({
        title:
          status === 401 || status === 403
            ? "Not authorized"
            : status
              ? `Request failed (${status})`
              : "Network error",
        message:
          data?.message ||
          (error.request && !error.response
            ? "Couldn't reach the server. Is the API running?"
            : error.message) ||
          "An unexpected error occurred.",
        statusCode: status,
        code: data?.code,
      });
    }

    return Promise.reject(error);
  }
);
