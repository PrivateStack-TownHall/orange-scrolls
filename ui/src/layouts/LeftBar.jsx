import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { LayoutDashboard, ChevronDown, ChevronRight } from "lucide-react";

export default function LeftBar() {
  return (
    <aside className="scroll animate-in-fade">
      {/* DECORATIVE FRAME — purely visual, sits behind the content layer.
          top/bottom are real <img> elements at their natural aspect
          ratio; the middle piece is a flex-1 div that auto-stretches to
          fill whatever space is left, so nothing needs to be
          hand-calculated in pixels. */}
      <div className="scroll__frame py-2" aria-hidden="true">
        <img src="/backgrounds/scrolls-leftbar-top.png" alt="" />
        <div className="scroll__frame-middle" />
        <img src="/backgrounds/scrolls-leftbar-bottom.png" alt="" />
      </div>

      {/* CONTENT — sits above the frame, has no idea the artwork
          even exists. Only the nav list scrolls; logo and frame stay put. */}
      <div className="scroll__menu-list">
        {/* LOGO */}
        <div className="shrink-0 pt-16 pb-6 px-8 flex flex-col items-center text-center">
          <img
            src="/os-logo.png"
            className="w-22 h-22 object-contain shrink-0"
            alt="Orange Scrolls"
          />
          <p className="font-bold leading-tight">Orange Scrolls</p>
          <p className="text-xs opacity-70">Content OS</p>
        </div>

        <nav
          aria-label="Main navigation"
          className="flex-1 min-h-0 overflow-y-auto px-16 pb-8 text-sm"
        >
          <ul className="os-nav-list space-y-2">
            {/* DASHBOARD */}
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `os-nav ${isActive ? "os-nav-active" : ""}`
                }
              >
                <LayoutDashboard size={18} />
                Dashboard
              </NavLink>
            </li>

            <DropdownMenu
              icon={
                <img
                  src="/icons/brands.png"
                  alt=""
                  className="w-5 h-5 object-contain"
                />
              }
              label="Brands"
              basePath="/brands"
              items={[
                { label: "List", path: "/brands" },
                { label: "Create", path: "/brands/create" },
              ]}
            />

            <DropdownMenu
              icon={
                <img
                  src="/icons/articles.png"
                  alt=""
                  className="w-5 h-5 object-contain"
                />
              }
              label="Articles"
              basePath="/articles"
              items={[
                { label: "List", path: "/articles" },
                { label: "Create", path: "/articles/create" },
              ]}
            />

            <DropdownMenu
              icon={
                <img
                  src="/icons/categories.png"
                  alt=""
                  className="w-5 h-5 object-contain"
                />
              }
              label="Categories"
              basePath="/categories"
              items={[
                { label: "List", path: "/categories" },
                { label: "Create", path: "/categories/create" },
              ]}
            />

            <DropdownMenu
              icon={
                <img
                  src="/icons/tags.png"
                  alt=""
                  className="w-5 h-5 object-contain"
                />
              }
              label="Tags"
              basePath="/tags"
              items={[
                { label: "List", path: "/tags" },
                { label: "Create", path: "/tags/create" },
              ]}
            />

            <DropdownMenu
              icon={
                <img
                  src="/icons/media.png"
                  alt=""
                  className="w-5 h-5 object-contain"
                />
              }
              label="Media"
              basePath="/media"
              items={[{ label: "Library", path: "/media" }]}
            />
          </ul>
        </nav>
      </div>
    </aside>
  );
}

function DropdownMenu({ icon, label, items, basePath }) {
  const location = useLocation();

  const isRouteInside = location.pathname.startsWith(basePath);

  const [open, setOpen] = useState(isRouteInside);
  const [prevIsRouteInside, setPrevIsRouteInside] = useState(isRouteInside);

  // Force the menu open when navigation brings us inside this section
  // (e.g. clicking a Link elsewhere while this component stays mounted).
  // Adjusting state directly during render — rather than in a useEffect —
  // is React's recommended pattern for this ("you might not need an Effect").
  if (isRouteInside !== prevIsRouteInside) {
    setPrevIsRouteInside(isRouteInside);
    if (isRouteInside) setOpen(true);
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="os-nav justify-between w-full"
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>

        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* CSS-only collapse (grid-template-rows trick) — replaces
          framer-motion's AnimatePresence height animation */}
      <div
        className={`os-collapsible ml-4 ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div>
          <ul
            className={`os-nav-sublist ${open ? "animate-in-slide-down" : ""}`}
          >
            {items.map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `os-nav-sub ${isActive ? "os-nav-sub-active" : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}
