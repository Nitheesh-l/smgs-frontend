import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

const Loader = ({ size = "md", className, text }: LoaderProps) => {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-12 h-12 border-4",
    lg: "w-16 h-16 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div
        className={cn(
          "rounded-full border-muted border-t-primary animate-spin",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-muted-foreground text-sm animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default Loader;
