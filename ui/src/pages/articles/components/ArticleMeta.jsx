export default function ArticleMeta({ article }) {
  const formattedDate = article.createdAt
    ? new Date(article.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <p className="text-sm opacity-60 mb-6 ml-12">
      {article.author}
      {formattedDate && ` • ${formattedDate}`}
    </p>
  );
}
