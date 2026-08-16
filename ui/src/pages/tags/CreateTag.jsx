import { useEffect, useState } from "react";
import { createTag, updateTag, getBrands } from "../../services";

export default function CreateTagForm({ initialData, onSuccess }) {
  const [brands, setBrands] = useState([]);

  const isEditing = !!initialData;

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    brandId: initialData?.brandId ?? "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const brandsData = await getBrands();

      setBrands(brandsData);
    };

    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditing) {
      await updateTag(initialData.id, form);
    } else {
      await createTag(form);
    }

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* TAG NAME */}
      <div>
        <label className="os-label">Tag Name</label>

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="os-input"
          placeholder="React"
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

      <button className="os-btn-primary">
        {isEditing ? "Update Tag" : "Save Tag"}
      </button>
    </form>
  );
}
