import { Link } from "react-router-dom";

import EmptyState from "../components/shared/feedback/EmptyState";

/** Catch-all for any URL that doesn't match a route. */
export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto py-10 text-center">
      <EmptyState
        title="404 — Page not found"
        description="The scroll you are looking for doesn't exist or has been moved."
      />

      <Link to="/" className="os-btn-primary inline-block mt-4">
        Back to Dashboard
      </Link>
    </div>
  );
}
