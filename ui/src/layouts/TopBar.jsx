import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Palette } from "lucide-react";

const BRANDS = [
  { id: 1, name: "Orange Kode" },
  { id: 2, name: "Sadino Technology" },
  { id: 3, name: "Sekolah Stack" },
  { id: 4, name: "Protein Shack" },
  { id: 5, name: "Cookiefy" },
];

const TYPEWRITER_TEXT = "Content Operating System...";

function useTypewriter(text, typeSpeed = 80, deleteSpeed = 40, pause = 1800) {
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout;

    if (!isDeleting && index < text.length) {
      timeout = setTimeout(() => setIndex(index + 1), typeSpeed);
    } else if (!isDeleting && index === text.length) {
      timeout = setTimeout(() => setIsDeleting(true), pause);
    } else if (isDeleting && index > 0) {
      timeout = setTimeout(() => setIndex(index - 1), deleteSpeed);
    } else if (isDeleting && index === 0) {
      // brief pause before the text starts typing again
      timeout = setTimeout(() => setIsDeleting(false), 500);
    }

    return () => clearTimeout(timeout);
  }, [index, isDeleting, text, typeSpeed, deleteSpeed, pause]);

  return text.slice(0, index);
}

export default function TopBar() {
  // Lazy-init directly from localStorage instead of loading it in an
  // effect — avoids an unnecessary extra render on mount.
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "classic",
  );

  const typedText = useTypewriter(TYPEWRITER_TEXT);

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
    <header className="os-topbar">
      {/* BRAND SHORTCUTS */}

      <div className="flex items-center gap-2 flex-wrap">
        {BRANDS.map((brand) => (
          <Link
            key={brand.id}
            to={`/brands/${brand.id}/detail`}
            className="text-xs border border-[var(--os-border-main)] px-3 py-1.5 rounded-full hover:bg-[var(--os-nav-hover)] transition-colors whitespace-nowrap"
          >
            {brand.name}
          </Link>
        ))}
      </div>

      {/* TYPEWRITER */}

      <div className="flex-1 text-center text-sm opacity-70 hidden md:block truncate px-4">
        {typedText}
        <span className="animate-pulse">|</span>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-3 shrink-0">
        {/* THEME DROPDOWN */}

        <div className="relative flex items-center">
          <Palette size={16} className="absolute left-2.5 pointer-events-none" />

          <select
            value={theme}
            onChange={handleThemeChange}
            className="
              appearance-none
              pl-8
              pr-4
              py-1.5
              text-sm
              bg-transparent
              border
              border-[var(--os-border-main)]
              rounded-full
              cursor-pointer
              hover:bg-[var(--os-nav-hover)]
            "
          >
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
          </select>
        </div>

        {/* NOTIFICATIONS */}

        <button
          disabled
          title="Notifications (coming soon)"
          className="relative p-1.5 rounded-full opacity-70 cursor-not-allowed"
        >
          <img
            src="/icons/bell_ribbon.png"
            alt="Notifications"
            className="w-7 h-7 object-contain"
          />
        </button>
      </div>
    </header>
  );
}
