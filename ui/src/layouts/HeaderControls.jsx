import { useEffect, useState } from "react";

import NotificationBell from "../components/notifications/NotificationBell";

/**
 * Fixed top-right controls (theme toggle + notification bell), rendered
 * once from MainLayout so it stays put while page content scrolls —
 * matches the corner position in the redesign mockups.
 */
export default function HeaderControls() {
  // Lazy-init directly from localStorage instead of loading it in an
  // effect — avoids an unnecessary extra render on mount.
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "classic",
  );

  // Keep the DOM attribute in sync with `theme` whenever it changes
  // (covers both the initial value and later user changes).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleThemeChange = (e) => {
    const selectedTheme = e.target.value;
    setTheme(selectedTheme);
    localStorage.setItem("theme", selectedTheme);
  };

  return (
    <div className="flex items-center gap-3">
      {/* THEME DROPDOWN */}

      <div className="relative flex items-center">
        <img
          src="/icons/lantern.png"
          alt=""
          aria-hidden="true"
          className="absolute left-1.5 w-4 h-4 object-contain pointer-events-none"
        />

        <select
          value={theme}
          onChange={handleThemeChange}
          className="
            appearance-none
            pl-7
            pr-4
            py-1.5
            text-sm
            bg-[var(--os-bg-content)]
            border
            border-[var(--os-border-main)]
            rounded-full
            cursor-pointer
            hover:bg-[var(--os-nav-hover)]
            transition-colors
          "
        >
          <option value="classic">Classic</option>
          <option value="modern">Modern</option>
        </select>
      </div>

      {/* NOTIFICATIONS */}

      <NotificationBell />
    </div>
  );
}
