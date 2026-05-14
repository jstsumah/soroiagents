"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileJson
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataMigrationButtonsProps {
  data: any[];
  onImport: (data: any[]) => Promise<{ successCount: number; errors: string[] }>;
  entityName: string;
}

export function DataMigrationButtons({ 
  data, 
  onImport, 
  entityName 
}: DataMigrationButtonsProps) {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${entityName.toLowerCase()}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `${data.length} ${entityName.toLowerCase()} records exported.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An error occurred while exporting data.",
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        
        if (!Array.isArray(importedData)) {
          throw new Error("Invalid file format. Expected a JSON array.");
        }

        const result = await onImport(importedData);
        
        if (result.errors.length > 0) {
          toast({
            variant: "destructive",
            title: "Import Completed with Errors",
            description: `Successfully imported ${result.successCount} records. ${result.errors.length} errors occurred.`,
          });
          console.error("Import errors:", result.errors);
        } else {
          toast({
            title: "Import Successful",
            description: `Successfully imported ${result.successCount} ${entityName.toLowerCase()} records.`,
          });
        }
        
        // Reset file input
        event.target.value = '';
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: error.message || "Invalid JSON file.",
        });
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExport}
        title={`Export ${entityName} as JSON`}
      >
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
      
      <div className="relative">
        <input
          type="file"
          id={`import-${entityName.toLowerCase()}`}
          className="hidden"
          accept=".json"
          onChange={handleFileChange}
          disabled={isImporting}
        />
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isImporting}
          asChild
        >
          <label htmlFor={`import-${entityName.toLowerCase()}`} className="cursor-pointer">
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </label>
        </Button>
      </div>
    </div>
  );
}
