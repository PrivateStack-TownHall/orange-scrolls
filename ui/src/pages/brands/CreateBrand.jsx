import { useState } from "react";
import { createBrand } from "../../services";

export default function CreateBrandForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await createBrand(form);

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* BRAND NAME */}

      <div>
        <label className="os-label">Brand Name</label>

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="os-input"
          placeholder="Orange Kode"
        />
      </div>

      {/* DESCRIPTION */}

      <div>
        <label className="os-label">Description</label>

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          className="os-input"
          rows={3}
          placeholder="Coding education and technology learning platform."
        />
      </div>

      <button className="os-btn-primary">Save Brand</button>
    </form>
  );
}
