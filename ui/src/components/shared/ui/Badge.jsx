/**
 * Wax-seal styled status badge.
 *
 * Color mapping (locked in during the redesign discussion):
 *  - green   -> Published
 *  - yellow  -> Draft
 *  - chest   -> Archived (treasure chest — "stored away")
 *  - purple  -> Featured
 *  - blue    -> Info / general notification
 *
 * Usage:
 *   <Badge status="Published" />
 *   <Badge status="Featured" label="Featured" />
 */

const WAX_SEALS = {
  published: {
    image: "/icons/waxseals-green.png",
    label: "Published",
  },
  draft: {
    image: "/icons/waxseals-yellow.png",
    label: "Draft",
  },
  archived: {
    image: "/icons/treasure_chest.png",
    label: "Archived",
  },
  featured: {
    image: "/icons/waxseals-purple.png",
    label: "Featured",
  },
  info: {
    image: "/icons/waxseals-blue.png",
    label: "Info",
  },
};

const SIZES = {
  sm: "w-4",
  md: "w-5",
  lg: "w-7",
};

export default function Badge({ status, label, size = "sm", className = "" }) {
  const key = status?.toLowerCase();
  const seal = WAX_SEALS[key] ?? WAX_SEALS.info;
  const sizeClass = SIZES[size] ?? SIZES.sm;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-[var(--os-text-main)] ${className}`}
    >
      <img
        src={seal.image}
        alt=""
        aria-hidden="true"
        className={`${sizeClass} h-auto shrink-0`}
      />
      {label ?? seal.label}
    </span>
  );
}
