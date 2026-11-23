import { fieldProps } from "../articleForm";

function CategorySelect({ categories = [], value, onChange, invalid = false }) {
  return (
    <select
      id="categoryId"
      name="categoryId"
      value={value}
      onChange={onChange}
      className={`os-input${invalid ? " border-red-500" : ""}`}
      {...fieldProps("categoryId", invalid ? { categoryId: true } : {})}
    >
      <option value="">Select Category</option>

      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

export default CategorySelect;
