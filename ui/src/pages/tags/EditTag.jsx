import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Direct navigation to this route (e.g. a bookmarked URL) redirects back
 * to the Tags list, where editing happens via the Edit button's popup —
 * the same pattern already used for Create.
 */
export default function EditTag() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/tags", { replace: true });
  }, [id, navigate]);

  return null;
}
