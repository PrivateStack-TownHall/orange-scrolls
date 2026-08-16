import { Pencil, FileText, Tag, Layers, Image, Eye } from "lucide-react";
import { Link } from "react-router-dom";

export default function BrandCard({
  brand,
  articleCount,
  categoryCount,
  tagCount,
  mediaCount,
  onDelete,
}) {
  const max = Math.max(articleCount, categoryCount, tagCount, mediaCount, 1);

  const stats = [
    {
      label: "Articles",
      value: articleCount,
      icon: <FileText size={16} />,
    },
    {
      label: "Categories",
      value: categoryCount,
      icon: <Layers size={16} />,
    },
    {
      label: "Tags",
      value: tagCount,
      icon: <Tag size={16} />,
    },
    {
      label: "Media",
      value: mediaCount,
      icon: <Image size={16} />,
    },
  ];

  return (
    <div className="os-card os-hover-lift animate-in-fade flex flex-col gap-4">
      {/* HEADER */}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={brand.logoImage || "/icons/shield_feather.png"}
            alt=""
            aria-hidden="true"
            className="w-10 h-10 object-contain shrink-0"
          />
          <h2 className="font-semibold text-lg truncate">{brand.name}</h2>
        </div>

        <div className="flex gap-1 shrink-0">
          <Link
            to={`/brands/${brand.id}/detail`}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
            aria-label="View brand"
          >
            <Eye size={14} />
          </Link>

          <Link
            to={`/brands/${brand.id}/edit`}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
            aria-label="Edit brand"
          >
            <Pencil size={14} />
          </Link>

          <button
            onClick={() => onDelete(brand)}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
            aria-label="Delete brand"
          >
            <img
              src="/icons/torn_scroll.png"
              alt=""
              className="w-3.5 h-3.5 object-contain"
            />
          </button>
        </div>
      </div>

      {brand.description && (
        <p className="text-xs opacity-70 -mt-2 line-clamp-2">
          {brand.description}
        </p>
      )}

      <div className="border-t border-[var(--os-border-soft)]" />

      {/* STATS */}

      <div className="flex flex-col gap-3">
        {stats.map((stat) => {
          const percent = (stat.value / max) * 100;

          return (
            <div key={stat.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {stat.icon}
                  {stat.label}
                </div>

                <span className="font-semibold">{stat.value}</span>
              </div>

              <div className="h-2 bg-[var(--os-nav-hover)] rounded">
                <div
                  className="h-2 bg-[var(--os-primary)] rounded"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
