import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { getArticles, deleteArticle } from "../../services";

import ArticleHeader from "./components/ArticleHeader";
import ArticleMeta from "./components/ArticleMeta";
import ArticleTags from "./components/ArticleTags";
import ArticleInfo from "./components/ArticleInfo";

export default function ArticleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchArticle = async () => {
      try {
        const data = await getArticles();
        const found = data.find((a) => a.slug === slug);

        if (!ignore) setArticle(found ?? null);
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
    if (!confirm("Delete this article?")) return;

    await deleteArticle(article.id);

    navigate("/articles");
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

      <ArticleHeader article={article} onDelete={handleDelete} />

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
    </div>
  );
}
