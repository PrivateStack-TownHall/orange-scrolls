import { Link } from "react-router-dom";
import { Pencil, Eye } from "lucide-react";
import Badge from "../../../components/shared/ui/Badge";

export default function ArticleCard({ article, setDeleteTarget }) {
  return (
    <div className="os-card-portrait os-card-flush os-hover-lift animate-in-fade overflow-hidden flex flex-col">
      {/* THUMBNAIL */}
      {article.thumbnail ? (
        <img
          src={article.thumbnail}
          alt={article.title}
          className="w-full h-40 object-cover p-2 border-md"
        />
      ) : (
        <div className="w-full h-40 bg-[var(--os-nav-hover)] flex items-center justify-center text-xs opacity-60">
          No Image
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <h2 className="font-semibold text-lg mb-1">{article.title}</h2>

        <p className="text-xs opacity-70 mb-2">
          {article.brand?.name} • {article.category?.name}
        </p>

        {/* STATUS */}
        <div className="mb-2">
          <Badge status={article.status} label={article.status} />
        </div>

        {/* EXCERPT */}
        <p className="text-sm opacity-80 mb-3 line-clamp-3">
          {article.excerpt}
        </p>

        {/* META */}
        <div className="flex items-center justify-between text-xs opacity-70 mt-auto">
          <div>
            <div>{article.author}</div>
            <div>{article.createdAt}</div>
          </div>

          <div className="flex items-center gap-1">
            <Eye size={14} />
            {article.views}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 text-xs mt-3">
          <Link
            to={`/articles/${article.slug}`}
            className="flex items-center gap-1 text-blue-600 opacity-70 hover:opacity-100"
          >
            <Eye size={14} />
            View
          </Link>

          <Link
            to={`/articles/${article.id}/edit`}
            className="flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <Pencil size={14} />
            Edit
          </Link>

          <button
            onClick={() => setDeleteTarget(article)}
            className="flex items-center gap-1 text-red-600 opacity-70 hover:opacity-100"
          >
            <img
              src="/icons/torn_scroll.png"
              alt=""
              className="w-4 h-4 object-contain"
            />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
