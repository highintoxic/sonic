import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload, Music } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  className?: string;
  children?: React.ReactNode;
}

export const FileUpload = ({ 
  onFileSelect, 
  accept = { "audio/*": [".mp3", ".wav", ".m4a", ".ogg"] }, 
  className, 
  children 
}: FileUploadProps) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer transition-colors",
        "hover:border-accent hover:bg-accent/5",
        (isDragActive || dragActive) && "border-accent bg-accent/10",
        className
      )}
    >
      <input {...getInputProps()} />
      {children || (
        <div className="space-y-4">
          <div className="flex justify-center">
            {isDragActive ? (
              <Music className="h-12 w-12 text-accent" />
            ) : (
              <Upload className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-lg font-mono">
              {isDragActive ? "DROP IT" : "DRAG & DROP"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select an audio file
            </p>
          </div>
        </div>
      )}
    </div>
  );
};