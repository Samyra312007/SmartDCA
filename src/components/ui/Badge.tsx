import { cn } from "@/lib/utils";

interface BadgeProps {
  children:   React.ReactNode;
  variant?:   "green" | "red" | "yellow" | "purple" | "blue" | "gray";
  size?:      "sm" | "md";
  dot?:       boolean;
  className?: string;
}

const variants = {
  green:  "bg-green-500/15 text-green-400 border-green-500/20",
  red:    "bg-red-500/15 text-red-400 border-red-500/20",
  yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  blue:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  gray:   "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const dotColors = {
  green:  "bg-green-400",
  red:    "bg-red-400",
  yellow: "bg-yellow-400",
  purple: "bg-purple-400",
  blue:   "bg-blue-400",
  gray:   "bg-gray-400",
};

export function Badge({
  children,
  variant   = "gray",
  size      = "sm",
  dot       = false,
  className,
}: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5",
      "rounded-full border font-medium",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      variants[variant],
      className
    )}>
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full animate-pulse",
          dotColors[variant]
        )} />
      )}
      {children}
    </span>
  );
}