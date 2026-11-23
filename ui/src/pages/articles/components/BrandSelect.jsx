import { fieldProps } from "../articleForm";

function BrandSelect({ brands = [], value, onChange, invalid = false }) {
  return (
    <select
      id="brandId"
      name="brandId"
      value={value}
      onChange={onChange}
      className={`os-input${invalid ? " border-red-500" : ""}`}
      {...fieldProps("brandId", invalid ? { brandId: true } : {})}
    >
      <option value="">Select Brand</option>

      {brands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </select>
  );
}

export default BrandSelect;
