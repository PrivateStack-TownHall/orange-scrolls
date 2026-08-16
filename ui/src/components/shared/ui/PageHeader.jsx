import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Breadcrumb from "./Breadcrumb";
import { getBrands } from "../../../services";

/**
 * Shared header block rendered at the top of every page:
 *   [feather icon] Title                    [brand pills]
 *   Breadcrumb
 *   -------------------- divider --------------------
 *
 * The theme toggle + notification bell live in a fixed corner via
 * <HeaderControls /> rendered once from MainLayout (not per-page),
 * so this component only needs the title/breadcrumb/brand-pill row.
 */
export default function PageHeader({ title, breadcrumb }) {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadBrands = async () => {
      try {
        const data = await getBrands();
        if (!ignore) setBrands(data);
      } catch (err) {
        console.error("Failed to load brands for header:", err);
      }
    };

    loadBrands();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/icons/feather-pen.png"
              alt=""
              aria-hidden="true"
              className="w-7 h-7 object-contain shrink-0 -rotate-6"
            />
            <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          </div>

          <div className="mt-1 ml-10">
            <Breadcrumb items={breadcrumb} />
          </div>
        </div>

        {brands.length > 0 && (
          <div className="flex flex-wrap gap-2 md:justify-end">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={`/brands/${brand.id}/detail`}
                className="os-brand-pill"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="os-divider mt-4" />
    </div>
  );
}
