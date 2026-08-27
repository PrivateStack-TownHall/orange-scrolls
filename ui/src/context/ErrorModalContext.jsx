import { createContext, useCallback, useContext, useEffect, useState } from "react";
import ErrorModal from "../components/shared/feedback/ErrorModal";
import { registerErrorHandler } from "./errorModalBridge";

const ErrorModalContext = createContext(null);

export function ErrorModalProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    title: "",
    message: "",
    statusCode: null,
    code: null,
  });

  const showError = useCallback(
    ({ title, message, statusCode, code } = {}) => {
      setState({
        isOpen: true,
        title: title || "Something went wrong",
        message: message || "An unexpected error occurred.",
        statusCode: statusCode || null,
        code: code || null,
      });
    },
    []
  );

  // Register with the module-level bridge as a side effect (not during
  // render) so the axios interceptor in services/api.js can call it.
  useEffect(() => {
    registerErrorHandler(showError);
  }, [showError]);

  const close = () => setState((prev) => ({ ...prev, isOpen: false }));

  return (
    <ErrorModalContext.Provider value={{ showError }}>
      {children}

      <ErrorModal
        isOpen={state.isOpen}
        onClose={close}
        title={state.title}
        message={state.message}
        statusCode={state.statusCode}
        code={state.code}
      />
    </ErrorModalContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useErrorModal() {
  const ctx = useContext(ErrorModalContext);

  if (!ctx) {
    throw new Error("useErrorModal must be used within an ErrorModalProvider");
  }

  return ctx;
}
