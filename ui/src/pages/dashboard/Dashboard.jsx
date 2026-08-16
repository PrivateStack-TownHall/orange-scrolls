import { useEffect, useState } from "react";

import Badge from "../../components/shared/ui/Badge";
import PageHeader from "../../components/shared/layout/PageHeader";

import {
  getArticles,
  getBrands,
  getCategories,
  getTags,
  getMedia,
} from "../../services";

export default function Dashboard() {
  const [stats, setStats] = useState({
    articles: 0,
    brands: 0,
    categories: 0,
    tags: 0,
    media: 0,
  });

  const [published, setPublished] = useState([]);
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [articles, brands, categories, tags, media] = await Promise.all([
          getArticles(),
          getBrands(),
          getCategories(),
          getTags(),
          getMedia(),
        ]);

        setStats({
          articles: articles.length,
          brands: brands.length,
          categories: categories.length,
          tags: tags.length,
          media: media.length,
        });

        setPublished(
          articles.filter((a) => a.status === "Published").slice(0, 5),
        );

        setDraft(articles.filter((a) => a.status === "Draft").slice(0, 5));
      } catch (error) {
        console.error("Dashboard error:", error);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { title: "Articles", value: stats.articles, icon: "/icons/articles.png" },
    { title: "Brands", value: stats.brands, icon: "/icons/brands.png" },
    {
      title: "Categories",
      value: stats.categories,
      icon: "/icons/categories.png",
    },
    { title: "Tags", value: stats.tags, icon: "/icons/tags.png" },
    { title: "Media", value: stats.media, icon: "/icons/media.png" },
  ];

  return (
    <div>
      <PageHeader
        title="Orange Scrolls"
        breadcrumb={[{ label: "Dashboard" }]}
      />

      {/* SYSTEM OVERVIEW */}

      <div className="os-card-banner mb-8 animate-in-fade flex items-center gap-4 px-2">
        <img
          src="/icons/compass.png"
          alt=""
          aria-hidden="true"
          className="w-12 h-12 object-contain shrink-0 ml-2"
        />

        <div>
          <h2 className="text-lg font-semibold mb-1">System Overview</h2>

          <p className="text-sm opacity-80">
            Orange Scrolls powers internal content management for multiple
            brands including OrangeKode, Sadino Technology, Sekolah Stack,
            Protein Shack, and Cookiefy.
          </p>
        </div>
      </div>

      {/* STATS */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-10">
        {cards.map((card, i) => (
          <div key={i} className="os-card os-hover-lift animate-in-slide-up">
            <div className="flex justify-between mb-3">
              <img
                src={card.icon}
                alt=""
                aria-hidden="true"
                className="w-10 h-10 object-contain"
              />
            </div>

            <div className="text-3xl font-bold">{card.value}</div>

            <div className="text-sm opacity-70">{card.title}</div>
          </div>
        ))}
      </div>

      {/* ARTICLES SECTION */}

      <div className="grid md:grid-cols-2 gap-6">
        {/* PUBLISHED */}

        <div className="os-card">
          <h2 className="text-lg font-semibold mb-4">Published Articles</h2>

          <div className="space-y-2">
            {published.length === 0 && (
              <p className="text-sm opacity-60">No published articles yet.</p>
            )}

            {published.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 text-sm border-b border-[var(--os-border-soft)] pb-2"
              >
                <span className="truncate">{a.title}</span>
                <Badge status="Published" label="" size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* DRAFT */}

        <div className="os-card">
          <h2 className="text-lg font-semibold mb-4">Draft Articles</h2>

          <div className="space-y-2">
            {draft.length === 0 && (
              <p className="text-sm opacity-60">No draft articles yet.</p>
            )}

            {draft.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 text-sm border-b border-[var(--os-border-soft)] pb-2"
              >
                <span className="truncate">{a.title}</span>
                <Badge status="Draft" label="" size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
