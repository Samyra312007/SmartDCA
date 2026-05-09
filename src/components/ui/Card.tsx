import { cn } from "@/lib/utils";

interface CardProps {
  children:  React.ReactNode;
  className?: string;
  hover?:    boolean;
  glow?:     "purple" | "green" | "none";
}

export function Card({
  children,
  className,
  hover = false,
  glow  = "none",
}: CardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl",
        hover && "hover:border-gray-600 cursor-pointer transition-all",
        glow === "purple" && "shadow-lg shadow-purple-500/10 border-purple-500/20",
        glow === "green"  && "shadow-lg shadow-green-500/10 border-green-500/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 pt-6 pb-4 border-b border-white/5", className)}>
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "px-6 py-4 border-t border-white/5",
      "flex items-center justify-between",
      className
    )}>
      {children}
    </div>
  );
}