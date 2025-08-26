import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { Disc3, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export const FloatingNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isRecognizePage = location.pathname === "/";
  const isUploadPage = location.pathname === "/upload";

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 bg-card/90 backdrop-blur-md border-2 border-border rounded-full p-4 shadow-2xl">
        {/* Recognize Knob */}
        <Button
          onClick={() => navigate("/")}
          className={cn(
            "w-16 h-16 rounded-full p-0 relative transition-all duration-300",
            "border-4 shadow-lg hover:shadow-xl",
            isRecognizePage 
              ? "bg-accent border-accent text-accent-foreground scale-110 shadow-accent/20" 
              : "bg-muted border-border text-muted-foreground hover:bg-accent/20 hover:border-accent/50"
          )}
        >
          <Disc3 size={24} />
          {/* Knob details */}
          <div className="absolute inset-2 rounded-full border border-current opacity-30" />
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-current rounded-full opacity-50" />
        </Button>
        
        {/* Center Divider */}
        <div className="w-0.5 h-8 bg-border" />
        
        {/* Upload Knob */}
        <Button
          onClick={() => navigate("/upload")}
          className={cn(
            "w-16 h-16 rounded-full p-0 relative transition-all duration-300",
            "border-4 shadow-lg hover:shadow-xl",
            isUploadPage 
              ? "bg-accent border-accent text-accent-foreground scale-110 shadow-accent/20" 
              : "bg-muted border-border text-muted-foreground hover:bg-accent/20 hover:border-accent/50"
          )}
        >
          <Upload size={24} />
          {/* Knob details */}
          <div className="absolute inset-2 rounded-full border border-current opacity-30" />
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-2 bg-current rounded-full opacity-50" />
        </Button>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-2 px-4">
        <span className="text-xs font-mono text-muted-foreground">RECOGNIZE</span>
        <span className="text-xs font-mono text-muted-foreground">UPLOAD</span>
      </div>
    </div>
  );
};