import { cn } from "@/lib/utils";

interface VinylRecordProps {
  size?: "sm" | "md" | "lg";
  spinning?: boolean;
  className?: string;
}

export const VinylRecord = ({ size = "md", spinning = false, className }: VinylRecordProps) => {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32"
  };

  return (
    <div className={cn(
      "relative rounded-full bg-foreground border-4 border-vinyl flex items-center justify-center",
      sizeClasses[size],
      
      className
    )}>
      {/* Center hole */}
      <div className="w-3 h-3 bg-background rounded-full" />
      
      {/* Vinyl grooves */}
      <div className="absolute inset-2 rounded-full border border-vinyl/20" />
      <div className="absolute inset-4 rounded-full border border-vinyl/20" />
      <div className="absolute inset-6 rounded-full border border-vinyl/20" />
    </div>
  );
};