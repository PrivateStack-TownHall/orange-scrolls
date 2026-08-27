import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ErrorModalProvider } from "../context/ErrorModalContext";

function App() {
  return (
    <ErrorModalProvider>
      <RouterProvider router={router} />
    </ErrorModalProvider>
  );
}

export default App;
