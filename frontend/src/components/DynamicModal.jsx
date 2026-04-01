import React from "react";

const baseInputClasses =
  "w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500/40";

export default function DynamicModal({
  isOpen,
  onClose,
  title,
  description,
  onSubmit,
  fields,
  submitLabel = "Create",
  formState,
  setFormState,
  children,
  size = "md",
}) {
  if (!isOpen) return null;

  const handleFieldChange = (name, value) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formState);
  };

  // --- Attendees section logic ---
  const addAttendee = () => {
    setFormState((prev) => {
      if (prev.attendees?.length >= 5) return prev;
      const newAttendees = [...(prev.attendees || []), { name: "", email: "" }];
      return { ...prev, attendees: newAttendees };
    });
  };

  const updateAttendee = (index, field, value) => {
    setFormState((prev) => {
      const updated = [...(prev.attendees || [])];
      updated[index][field] = value;
      return { ...prev, attendees: updated };
    });
  };

  const renderField = (field) => {
    const {
      name,
      type,
      placeholder,
      required,
      options,
      rows,
      min,
      max,
      step,
      disabled,
      description: fieldDescription,
    } = field;

    switch (type) {
      case "section":
        return (
          <div className="pt-4">
            {field.label && (
              <p className="text-xs uppercase tracking-wide text-gray-400">
                {field.label}
              </p>
            )}
            {fieldDescription && (
              <p className="mt-1 text-sm text-gray-500">
                {fieldDescription}
              </p>
            )}
          </div>
        );

      case "readonly":
        return (
          <div className="px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-300">
            {formState[name] || placeholder || "—"}
          </div>
        );

      case "select":
        return (
          <select
            value={formState[name] ?? ""}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className={baseInputClasses}
            required={required}
            disabled={disabled}
          >
            {field.placeholder && (
              <option value="" disabled>
                {field.placeholder}
              </option>
            )}
            {options?.map((option) => (
              <option key={option.value ?? option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "checkbox-group": {
        const currentValues = Array.isArray(formState[name])
          ? formState[name]
          : [];
        const toggleValue = (value) => {
          if (currentValues.includes(value)) {
            handleFieldChange(
              name,
              currentValues.filter((item) => item !== value)
            );
          } else {
            handleFieldChange(name, [...currentValues, value]);
          }
        };
        return (
          <div className="flex flex-wrap gap-2">
            {options?.map((option) => {
              const checked = currentValues.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1 text-sm ${
                    checked
                      ? "border-yellow-400 bg-yellow-400/10 text-yellow-200"
                      : "border-gray-700 bg-gray-800/60 text-gray-200"
                  } cursor-pointer select-none`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(option.value)}
                    className="w-4 h-4 rounded bg-gray-900 border-gray-600"
                    disabled={disabled}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case "textarea":
        return (
          <textarea
            placeholder={placeholder}
            value={formState[name] ?? ""}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className={`${baseInputClasses} min-h-[100px] resize-y`}
            required={required}
            disabled={disabled}
            rows={rows || 4}
          />
        );

      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formState[name] || false}
              onChange={(e) => handleFieldChange(name, e.target.checked)}
              className="w-4 h-4 rounded bg-gray-800 border-gray-700"
              disabled={disabled}
            />
            <span>{field.label}</span>
          </label>
        );

      case "number":
        return (
          <input
            type="number"
            placeholder={placeholder}
            value={formState[name] ?? ""}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className={baseInputClasses}
            required={required}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
          />
        );

      case "date":
      case "time":
        return (
          <input
            type={type}
            placeholder={placeholder}
            value={formState[name] ?? ""}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className={baseInputClasses}
            required={required}
            disabled={disabled}
          />
        );

      default:
        return (
          <input
            type={type || "text"}
            placeholder={placeholder}
            value={formState[name] ?? ""}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            className={baseInputClasses}
            required={required}
            disabled={disabled}
          />
        );
    }
  };

  const sizeClass =
    size === "xl"
      ? "max-w-4xl"
      : size === "lg"
      ? "max-w-2xl"
      : size === "sm"
      ? "max-w-sm"
      : "max-w-md";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="dynamic-modal-overlay absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex min-h-full items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div
          className={`w-full ${sizeClass} rounded-2xl bg-gray-900 p-6 shadow-2xl shadow-black/30 max-h-[90vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-400 leading-relaxed">
                {description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dynamic fields */}
          {fields.map((field, index) => {
            const key = field.name || `field-${index}`;
            const hideLabel = ["checkbox", "section"].includes(field.type);
            return (
              <div key={key} className="space-y-1">
                {field.label && !hideLabel && (
                  <label className="block text-sm text-gray-300">
                    {field.label}
                    {field.required && <span className="text-red-400">*</span>}
                  </label>
                )}
                {renderField(field)}
                {field.hint && (
                  <p className="text-xs text-gray-500">{field.hint}</p>
                )}
              </div>
            );
          })}

          {/* Attendees Section */}
          {(formState.attendees || []).map((attendee, index) => (
            <div key={`attendee-${index}`} className="mt-6 space-y-3">
              <h3 className="block text-sm text-gray-300">
                Attendees (up to 5)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={`Name ${index + 1}`}
                  value={attendee.name}
                  onChange={(e) =>
                    updateAttendee(index, "name", e.target.value)
                  }
            className={baseInputClasses}
                />
                <input
                  type="email"
                  placeholder={`Email ${index + 1}`}
                  value={attendee.email}
                  onChange={(e) =>
                    updateAttendee(index, "email", e.target.value)
                  }
            className={baseInputClasses}
                />
              </div>
              {formState.attendees?.length < 5 && (
                <button
                  type="button"
                  onClick={addAttendee}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm mt-2 text-white"
                >
                  + Add Attendee
                </button>
              )}
            </div>
          ))}

          {/* Optional extra children (for custom sections) */}
          {children}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dynamic-modal-confirm px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              {submitLabel}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
