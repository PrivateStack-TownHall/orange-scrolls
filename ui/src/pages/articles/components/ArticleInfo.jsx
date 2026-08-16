import { Eye, Globe, FolderOpen } from "lucide-react";

import Badge from "../../../components/shared/ui/Badge";

export default function ArticleInfo({ article }) {
  const isPrivate = article.visibility?.toLowerCase() === "private";

  const rows = [
    { label: "Brand", value: article.brand?.name },
    { label: "Category", value: article.category?.name, icon: FolderOpen },
    {
      label: "Visibility",
      value: article.visibility,
      ...(isPrivate
        ? { image: "/icons/padlock_key.png" }
        : { icon: Globe }),
    },
    { label: "Views", value: article.views, icon: Eye },
    {
      label: "Reading Time",
      value: article.readingTime ? `${article.readingTime} min` : "—",
      image: "/icons/hourglass.png",
    },
  ];

  return (
    <div className="os-card mt-10">
      <h2 className="font-semibold text-lg mb-4">Article Info</h2>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge status={article.status} label={article.status} size="md" />
      </div>

      <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {rows.map(({ label, value, icon: Icon, image }) => (
          <div key={label}>
            <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-60 mb-1">
              {Icon && <Icon size={12} />}
              {image && (
                <img src={image} alt="" className="w-3.5 h-3.5 object-contain" />
              )}
              {label}
            </dt>
            <dd className="font-medium">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
