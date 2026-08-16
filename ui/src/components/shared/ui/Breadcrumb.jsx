import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * items: array of { label, to? } — the last item is rendered as plain
 * text (current page), earlier items are links when `to` is provided.
 */
export default function Breadcrumb({ items }) {
  if (!items?.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm opacity-70"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-[var(--os-primary)] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium" : ""}>{item.label}</span>
            )}

            {!isLast && <ChevronRight size={14} className="opacity-50" />}
          </span>
        );
      })}
    </nav>
  );
}
