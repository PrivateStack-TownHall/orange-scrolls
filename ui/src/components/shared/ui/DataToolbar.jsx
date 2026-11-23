import { Grid, Table } from "lucide-react";

export default function DataToolbar({ view, setView, search, setSearch }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* LEFT */}

      <div className="flex items-center gap-3">
        <div className="os-search">
          <img src="/icons/treasure_map_magnifier.png" alt="" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search..."
            aria-label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="os-input"
          />
        </div>

        <select
          aria-label="Filter by brand"
          className="os-input"
          style={{ width: 176 }}
        >
          <option>All Brands</option>
          <option>OrangeKode</option>
          <option>Sadino Technology</option>
          <option>Elevora Bootcamp</option>
          <option>Protein Shack</option>
          <option>Cookiefy</option>
        </select>

        <select
          aria-label="Sort order"
          className="os-input"
          style={{ width: 144 }}
        >
          <option>Newest</option>
          <option>Oldest</option>
          <option>Most Views</option>
        </select>

        <select
          aria-label="Filter by status"
          className="os-input"
          style={{ width: 144 }}
        >
          <option>Published</option>
          <option>Draft</option>
          <option>All</option>
        </select>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView("grid")}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
          className={`os-btn-outline p-2 ${
            view === "grid" ? "os-nav-active" : ""
          }`}
        >
          <Grid size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setView("table")}
          aria-label="Table view"
          aria-pressed={view === "table"}
          className={`os-btn-outline p-2 ${
            view === "table" ? "os-nav-active" : ""
          }`}
        >
          <Table size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
