import { cn } from "@/lib/utils";

interface AlertProps {
  children:   React.ReactNode;
  variant?:   "info" | "success" | "warning" | "error";
  className?: string;
  onClose?:   () => void;
}

const styles = {
  info:    "bg-blue-500/10 border-blue-500/20 text-blue-300",
  success: "bg-green-500/10 border-green-500/20 text-green-300",
  warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300",
  error:   "bg-red-500/10 border-red-500/20 text-red-300",
};

const icons = {
  info:    "ℹ️",
  success: "✅",
  warning: "⚠️",
  error:   "❌",
};

export function Alert({
  children,
  variant   = "info",
  className,
  onClose,
}: AlertProps) {
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border p-4 text-sm",
      styles[variant],
      className
    )}>
      <span className="text-base flex-shrink-0">{icons[variant]}</span>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}