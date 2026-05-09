import { cn }                               from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gradient";
  size?:    "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant  = "primary",
      size     = "md",
      loading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base = [
      "inline-flex items-center justify-center",
      "font-medium rounded-xl transition-all duration-200",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
    ].join(" ");

    const variants = {
      primary:  "bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700",
      secondary:"bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700",
      danger:   "bg-red-600 text-white hover:bg-red-500",
      ghost:    "text-gray-400 hover:text-white hover:bg-white/5",
      gradient: [
        "bg-gradient-to-r from-purple-600 to-green-500",
        "text-white hover:opacity-90",
        "shadow-lg shadow-purple-500/20",
      ].join(" "),
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2.5 gap-2",
      lg: "text-base px-6 py-3 gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading...
          </>
        ) : children}
      </button>
    );
  }
);

Button.displayName = "Button";