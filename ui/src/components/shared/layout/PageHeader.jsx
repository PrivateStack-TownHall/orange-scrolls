import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * Consistent page header used across every page: feather icon, title,
 * breadcrumb trail, and an optional action button aligned to the same row
 * (e.g. "+ Create Brand") instead of floating below.
 *
 * @param {string} title - page title, e.g. "Articles"
 * @param {{ label: string, path?: string }[]} breadcrumb - trail items;
 *   the last item is rendered as plain text (current page), others as links.
 * @param {React.ReactNode} [action] - optional element (e.g. a button)
 *   rendered on the right side of the header row.
 */
export default function PageHeader({ title, breadcrumb = [], action }) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/icons/feather-pen.png"
            alt=""
            aria-hidden="true"
            className="w-8 h-8 object-contain shrink-0 -rotate-6"
          />

          <div>
            <h1 className="text-3xl font-bold leading-tight">{title}</h1>

            {breadcrumb.length > 0 && (
              <nav className="flex items-center gap-1.5 text-xs opacity-70 mt-1">
                {breadcrumb.map((item, i) => {
                  const isLast = i === breadcrumb.length - 1;

                  return (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && <ChevronRight size={12} />}
                      {isLast || !item.path ? (
                        <span className={isLast ? "font-medium" : ""}>
                          {item.label}
                        </span>
                      ) : (
                        <Link
                          to={item.path}
                          className="hover:text-[var(--os-primary)] transition-colors"
                        >
                          {item.label}
                        </Link>
                      )}
                    </span>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <hr className="os-page-header-divider" />
    </div>
  );
}
