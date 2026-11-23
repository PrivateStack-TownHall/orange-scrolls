import { Link } from "react-router-dom";
import { Pencil, Trash } from "lucide-react";

export default function ArticleHeader({ article, onDelete, deleting = false }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        <img
          src="/icons/feather-pen.png"
          alt=""
          aria-hidden="true"
          className="w-9 h-9 object-contain shrink-0 mt-1 -rotate-6"
        />
        <h1 className="text-4xl font-bold leading-tight">{article.title}</h1>
      </div>

      <div className="flex gap-2 shrink-0">
        <Link
          to={`/articles/${article.id}/edit`}
          className="os-btn-secondary flex items-center gap-2"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
          Edit
        </Link>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded font-medium bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Trash className="w-4 h-4" aria-hidden="true" />
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
