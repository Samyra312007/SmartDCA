import { cn }                                  from "@/lib/utils";
import { InputHTMLAttributes, forwardRef }     from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string;
  error?:     string;
  hint?:      string;
  prefix?:    string;
  suffix?:    string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, prefix, suffix, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-gray-500 text-sm select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-gray-900 border rounded-xl",
              "text-white placeholder:text-gray-600",
              "text-sm transition-colors",
              "focus:outline-none focus:ring-2",
              prefix ? "pl-8 pr-4 py-2.5" : "px-4 py-2.5",
              suffix ? "pr-12" : "",
              error
                ? "border-red-500/50 focus:ring-red-500/30"
                : "border-gray-700 focus:ring-purple-500/30 focus:border-purple-500/50",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-gray-500 text-sm select-none">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";