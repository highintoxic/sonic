import { Button } from "@/components/ui/button";
import { VinylRecord } from "@/components/VinylRecord";
import { Link, useLocation } from "react-router-dom";
import { Disc3, Upload } from "lucide-react";

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <VinylRecord size="sm" />
            <span className="text-xl font-bold tracking-tight">SONIC</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              variant={location.pathname === "/" ? "default" : "ghost"}
              asChild
              className="font-mono"
            >
              <Link to="/" className="flex items-center gap-2">
                <Disc3 size={16} />
                RECOGNIZE
              </Link>
            </Button>
            
            <Button
              variant={location.pathname === "/upload" ? "default" : "ghost"}
              asChild
              className="font-mono"
            >
              <Link to="/upload" className="flex items-center gap-2">
                <Upload size={16} />
                UPLOAD
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};