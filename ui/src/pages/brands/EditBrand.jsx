import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

import PageHeader from "../../components/shared/layout/PageHeader";
import Toast from "../../components/shared/feedback/Toast";

import { getBrandById, updateBrand } from "../../services";

export default function EditBrand() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  useEffect(() => {
    let ignore = false;

    const fetchBrand = async () => {
      try {
        const data = await getBrandById(+id);

        if (!ignore) {
          setForm({
            name: data.name ?? "",
            description: data.description ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch brand:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchBrand();

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);

    try {
      await updateBrand(+id, form);

      setToast({ show: true, type: "success", message: "Brand updated" });

      setTimeout(() => navigate("/brands"), 600);
    } catch (err) {
      console.error("Failed to update brand:", err);

      setToast({
        show: true,
        type: "error",
        message: "Failed to update brand",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm opacity-70">Loading brand...</div>;
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Edit Brand"
        breadcrumb={[
          { label: "Dashboard", path: "/" },
          { label: "Brands", path: "/brands" },
          { label: "Edit" },
        ]}
      />

      <form onSubmit={handleSubmit} className="os-card space-y-4">
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

        <div>
          <label className="os-label">Description</label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="os-input"
            rows={4}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="os-btn-primary disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <Link to="/brands" className="os-btn-outline">
            Cancel
          </Link>
        </div>
      </form>

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}
