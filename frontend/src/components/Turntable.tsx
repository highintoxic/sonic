import { cn } from "@/lib/utils";

interface TurntableProps {
  size?: "sm" | "md" | "lg";
  spinning?: boolean;
  className?: string;
}

export const Turntable = ({ size = "md", spinning = false, className }: TurntableProps) => {
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48", 
    lg: "w-64 h-64"
  };

  const vinylSizes = {
    sm: "w-24 h-24",
    md: "w-36 h-36",
    lg: "w-48 h-48"
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Turntable Base */}
      <div className="absolute inset-0 rounded-full bg-turntable border-4 border-border shadow-2xl">
        {/* Base details */}
        <div className="absolute inset-4 rounded-full border-2 border-turntable-arm/30" />
        <div className="absolute inset-8 rounded-full border border-turntable-arm/20" />
      </div>
      
      {/* Vinyl Record */}
      <div className={cn(
        "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
        "rounded-full bg-foreground border-4 border-vinyl flex items-center justify-center shadow-lg",
        vinylSizes[size],
        
      )}>
        {/* Center hole */}
        <div className="w-4 h-4 bg-background rounded-full border border-vinyl" />
        
        {/* Vinyl grooves */}
        <div className="absolute inset-2 rounded-full border border-vinyl/20" />
        <div className="absolute inset-4 rounded-full border border-vinyl/20" />
        <div className="absolute inset-6 rounded-full border border-vinyl/20" />
        <div className="absolute inset-8 rounded-full border border-vinyl/15" />
        
        {/* Vinyl label */}
        <div className="absolute inset-[40%] rounded-full bg-accent/20 border border-vinyl/30" />
      </div>
      
      {/* Turntable Arm */}
      <div className="absolute top-4 right-8 w-1 h-20 bg-turntable-arm rounded-full origin-bottom rotate-12 shadow-lg">
        {/* Arm head */}
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-turntable-arm rounded-full border border-border" />
        {/* Cartridge */}
        <div className="absolute bottom-0 -right-2 w-2 h-4 bg-accent rounded-sm" />
      </div>
      
      {/* Turntable controls */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="w-3 h-3 bg-accent rounded-full shadow-inner" />
        <div className="w-3 h-3 bg-muted rounded-full shadow-inner" />
      </div>
    </div>
  );
};