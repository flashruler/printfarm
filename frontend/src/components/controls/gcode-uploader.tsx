import { Upload } from "lucide-react";
import { useRef, useState } from "react";

interface GCodeUploaderProps {
  printerId: string;
  onUpload: (file: File) => void;
  isUploading: boolean;
  error?: string | null;
  success?: boolean;
}

export function GCodeUploader({ 
  onUpload, 
  isUploading, 
  error, 
  success 
}: GCodeUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  const handlePick = () => inputRef.current?.click();
  
  const handleFileChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    setSelectedName(f?.name || "");
  };

  const handleUpload = () => {
    const f = inputRef.current?.files?.[0];
    if (!f) return;
    onUpload(f);
  };

  return (
    <div className="pt-2 border-t border-border space-y-2">
      <h3 className="text-sm font-medium">Upload G-code</h3>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".gcode,.g,.nc"
          className="hidden"
          onChange={handleFileChosen}
        />
        <button
          className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-secondary hover:bg-secondary/70"
          onClick={handlePick}
        >
          <Upload className="w-4 h-4" /> Choose File
        </button>
        <span className="text-xs text-muted-foreground truncate max-w-48">
          {selectedName || "No file selected"}
        </span>
        <button
          className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          disabled={!selectedName || isUploading}
          onClick={handleUpload}
        >
          {isUploading ? "Uploading…" : "Upload & Print"}
        </button>
      </div>
      {error && (
        <div className="text-xs text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="text-xs text-green-600">
          Started print: {selectedName}
        </div>
      )}
    </div>
  );
}
