import { useEffect, useState } from "react";
import { getBrands, createCategory, updateCategory } from "../../services";
import { slugify } from "../../utils/slugify";

export default function CreateCategoryForm({ initialData, onSuccess }) {
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!initialData;

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    brandId: initialData?.brandId ?? "",
  });

  useEffect(() => {
    const fetchBrands = async () => {
      const data = await getBrands();
      setBrands(data);
    };

    fetchBrands();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Backend requires `slug` and a numeric `brandId` — this form only
    // collects a name, so derive the slug the same way CreateArticle.jsx
    // does, and coerce brandId (a string from the <select>) to a number.
    const payload = {
      name: form.name,
      slug: slugify(form.name),
      brandId: Number(form.brandId),
    };

    try {
      setSaving(true);
      setError("");

      if (isEditing) {
        await updateCategory(initialData.id, payload);
      } else {
        await createCategory(payload);
      }

      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to save category"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* CATEGORY NAME */}
      <div>
        <label className="os-label">Category Name</label>

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="os-input"
          placeholder="Frontend"
        />
      </div>

      {/* BRAND */}
      <div>
        <label className="os-label">Brand</label>

        <select
          name="brandId"
          value={form.brandId}
          onChange={handleChange}
          className="os-input"
        >
          <option value="">Select Brand</option>

          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      <button className="os-btn-primary" disabled={saving}>
        {saving ? "Saving..." : isEditing ? "Update Category" : "Save Category"}
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
