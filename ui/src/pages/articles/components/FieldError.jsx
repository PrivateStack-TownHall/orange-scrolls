/** Inline validation message tied to a field via aria-describedby. */
export default function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="text-xs text-red-600 mt-1">
      {message}
    </p>
  );
}
