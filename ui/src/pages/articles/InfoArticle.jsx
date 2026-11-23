import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { getArticleBySlug, deleteArticle } from "../../services";

import ConfirmDialog from "../../components/shared/feedback/ConfirmDialog";
import Toast from "../../components/shared/feedback/Toast";

import ArticleHeader from "./components/ArticleHeader";
import ArticleMeta from "./components/ArticleMeta";
import ArticleTags from "./components/ArticleTags";
import ArticleInfo from "./components/ArticleInfo";

export default function ArticleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ show: false, type: "error", message: "" });

  useEffect(() => {
    let ignore = false;

    const fetchArticle = async () => {
      setLoading(true);

      try {
        const data = await getArticleBySlug(slug);
        if (!ignore) setArticle(data);
      } catch (err) {
        // getArticleBySlug throws (404) when the article doesn't exist —
        // treat that the same as "not found" instead of leaving the page
        // stuck on the loading state.
        console.error(err);
        if (!ignore) setArticle(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchArticle();

    return () => {
      ignore = true;
    };
  }, [slug]);

  const handleDelete = async () => {
    if (deleting) return;

    try {
      setDeleting(true);

      // Soft delete: the article moves to the "Deleted" view of the list
      // and can be restored from there.
      await deleteArticle(article.id, { skipErrorModal: true });

      navigate("/articles");
    } catch (err) {
      console.error(err);

      setConfirmOpen(false);
      setToast({
        show: true,
        type: "error",
        message: err.response?.data?.message || "Failed to delete article",
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm opacity-70 text-center py-10">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-sm opacity-70 text-center py-10">
        Article not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      <nav className="flex items-center gap-1.5 text-xs opacity-70 mb-4">
        <Link to="/" className="hover:text-[var(--os-primary)] transition-colors">
          Dashboard
        </Link>
        <ChevronRight size={12} />
        <Link
          to="/articles"
          className="hover:text-[var(--os-primary)] transition-colors"
        >
          Articles
        </Link>
        <ChevronRight size={12} />
        <span className="font-medium">{article.title}</span>
      </nav>

      <ArticleHeader
        article={article}
        onDelete={() => setConfirmOpen(true)}
        deleting={deleting}
      />

      <ArticleMeta article={article} />

      {article.coverImage && (
        <img
          src={article.coverImage}
          alt={article.title}
          className="rounded-lg mb-6 w-full max-h-[420px] object-cover"
        />
      )}

      <ArticleTags tags={article.tags} />

      <div className="os-card">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>

      <ArticleInfo article={article} />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Article"
        message="This hides the article from the site and the article list. You can restore it later from the Deleted view on the Articles page."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        loadingText="Deleting..."
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}
