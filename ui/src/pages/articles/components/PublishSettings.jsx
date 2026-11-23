import FieldError from "./FieldError";
import { ARTICLE_VISIBILITIES, fieldProps, invalidClass } from "../articleForm";

/** Visibility + publishedAt / scheduledAt inputs for the Publish card. */
export default function PublishSettings({
  form,
  errors,
  onChange,
  publishedAtLocked = false,
}) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div>
        <label htmlFor="visibility" className="os-label">
          Visibility <span className="text-red-600">*</span>
        </label>

        <select
          id="visibility"
          name="visibility"
          value={form.visibility}
          onChange={onChange}
          className={`os-input${invalidClass("visibility", errors)}`}
          {...fieldProps("visibility", errors)}
        >
          {ARTICLE_VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <FieldError id="visibility-error" message={errors.visibility} />
      </div>

      <div>
        <label htmlFor="publishedAt" className="os-label">
          Published at
        </label>

        <input
          id="publishedAt"
          type="datetime-local"
          name="publishedAt"
          value={form.publishedAt}
          onChange={onChange}
          className={`os-input${invalidClass("publishedAt", errors)}`}
          {...fieldProps("publishedAt", errors)}
        />
        <p className="text-xs opacity-60 mt-1">
          {publishedAtLocked
            ? "Kept as publication history, even if the article goes back to Draft or Archived."
            : "Optional. Left empty, it is set automatically when the article is published."}
        </p>
        <FieldError id="publishedAt-error" message={errors.publishedAt} />
      </div>

      <div>
        <label htmlFor="scheduledAt" className="os-label">
          Scheduled for
        </label>

        <input
          id="scheduledAt"
          type="datetime-local"
          name="scheduledAt"
          value={form.scheduledAt}
          onChange={onChange}
          className={`os-input${invalidClass("scheduledAt", errors)}`}
          {...fieldProps("scheduledAt", errors)}
        />
        <p className="text-xs opacity-60 mt-1">
          Optional. Keep the article as Draft until this date.
        </p>
        <FieldError id="scheduledAt-error" message={errors.scheduledAt} />
      </div>
    </div>
  );
}
