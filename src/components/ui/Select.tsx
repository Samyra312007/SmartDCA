import { cn }                                    from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef }      from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:     string;
  error?:     string;
  hint?:      string;
  options:    { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full bg-gray-900 border rounded-xl",
            "text-white text-sm px-4 py-2.5",
            "transition-colors appearance-none",
            "focus:outline-none focus:ring-2",
            error
              ? "border-red-500/50 focus:ring-red-500/30"
              : "border-gray-700 focus:ring-purple-500/30 focus:border-purple-500/50",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-gray-900"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint  && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";