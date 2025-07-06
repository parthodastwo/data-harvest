import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, FileText, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { tokenStorage } from "@/lib/auth";
import type { DataSystem, DataSource } from "@shared/schema";

interface FileUpload {
  dataSourceId: number;
  file: File | null;
  uploaded: boolean;
}

export default function DataExtraction() {
  const [selectedDataSystemId, setSelectedDataSystemId] = useState<number>(0);
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const { toast } = useToast();
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Get all active data systems
  const { data: dataSystems, isLoading: dataSystemsLoading } = useQuery<
    DataSystem[]
  >({
    queryKey: ["/api/data-systems"],
  });

  // Get active data sources for selected data system
  const { data: dataSources, isLoading: dataSourcesLoading } = useQuery<
    DataSource[]
  >({
    queryKey: ["/api/data-systems", selectedDataSystemId, "data-sources"],
    queryFn: async () => {
      if (!selectedDataSystemId) return [];
      const response = await apiRequest(
        "GET",
        `/api/data-systems/${selectedDataSystemId}/data-sources`,
      );
      return response.json();
    },
    enabled: !!selectedDataSystemId,
  });

  // Initialize file uploads when data sources change
  useEffect(() => {
    if (dataSources) {
      const activeDataSources = dataSources.filter((ds) => ds.activeFlag);
      setFileUploads(
        activeDataSources.map((ds) => ({
          dataSourceId: ds.id,
          file: null,
          uploaded: false,
        })),
      );
    }
  }, [dataSources]);

  const handleDataSystemChange = (dataSystemId: string) => {
    const id = parseInt(dataSystemId);
    setSelectedDataSystemId(id);
    setFileUploads([]); // Reset file uploads when changing data system
  };

  const handleFileChange = (
    dataSourceId: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;

    if (file && !file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFileUploads((prev) =>
      prev.map((upload) =>
        upload.dataSourceId === dataSourceId
          ? { ...upload, file, uploaded: false }
          : upload,
      ),
    );
  };

  const handleUploadFile = async (dataSourceId: number) => {
    const upload = fileUploads.find((u) => u.dataSourceId === dataSourceId);
    if (!upload?.file) return;

    try {
      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("dataSourceId", dataSourceId.toString());

      const token = tokenStorage.get();
      const response = await fetch("/api/data-extraction/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setFileUploads((prev) =>
          prev.map((u) =>
            u.dataSourceId === dataSourceId ? { ...u, uploaded: true } : u,
          ),
        );

        toast({
          title: "Success",
          description: `File uploaded successfully for ${getDataSourceName(dataSourceId)}`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUploadAll = async () => {
    const pendingUploads = fileUploads.filter((u) => u.file && !u.uploaded);

    for (const upload of pendingUploads) {
      await handleUploadFile(upload.dataSourceId);
    }
  };

  const getDataSourceName = (dataSourceId: number) => {
    return dataSources?.find((ds) => ds.id === dataSourceId)?.name || "Unknown";
  };

  const getDataSourceFileName = (dataSourceId: number) => {
    return (
      dataSources?.find((ds) => ds.id === dataSourceId)?.filename || "File"
    );
  };

  const activeDataSources = dataSources?.filter((ds) => ds.activeFlag) || [];
  const hasAnyFiles = fileUploads.some((u) => u.file);
  const allUploaded =
    fileUploads.length > 0 && fileUploads.every((u) => !u.file || u.uploaded);
  const hasAnyUploaded = fileUploads.some((u) => u.uploaded);

  // Check if at least one master data source file is uploaded
  const hasMasterDataSourceUploaded = () => {
    if (!dataSources) return false;

    const masterDataSources = dataSources.filter(
      (ds) => ds.activeFlag && ds.isMaster,
    );
    return masterDataSources.some((ds) =>
      fileUploads.some(
        (upload) => upload.dataSourceId === ds.id && upload.uploaded,
      ),
    );
  };

  const handleExtract = async () => {
    if (!selectedDataSystemId) return;

    try {
      const token = tokenStorage.get();
      const response = await fetch("/api/data-extraction/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataSystemId: selectedDataSystemId,
        }),
      });

      if (response.ok) {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `extracted_data_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description:
            "Data extraction completed and file downloaded successfully",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Extraction failed");
      }
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to extract data. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (dataSystemsLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading data systems...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Extraction</h1>
          <p className="text-muted-foreground">
            Upload CSV files for data extraction processing
          </p>
        </div>
      </div>

      <Card>
        &nbsp;
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataSystem">Select Data System *</Label>
            <Select
              value={selectedDataSystemId.toString()}
              onValueChange={handleDataSystemChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a data system" />
              </SelectTrigger>
              <SelectContent>
                {dataSystems?.map((system: DataSystem) => (
                  <SelectItem key={system.id} value={system.id.toString()}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDataSystemId > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Found {activeDataSources.length} active data source
                {activeDataSources.length !== 1 ? "s" : ""} in this system
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDataSystemId > 0 && activeDataSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload CSV files for each data source in the selected system
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeDataSources.map((dataSource: DataSource) => {
              const upload = fileUploads.find(
                (u) => u.dataSourceId === dataSource.id,
              );
              return (
                <div
                  key={dataSource.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{dataSource.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dataSource.description}
                      </p>
                    </div>
                    {upload?.uploaded && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm">Uploaded</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`file-${dataSource.id}`}>
                      {dataSource.filename} *
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`file-${dataSource.id}`}
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileChange(dataSource.id, e)}
                        ref={(el) =>
                          (fileInputRefs.current[dataSource.id] = el)
                        }
                        disabled={upload?.uploaded}
                        className="flex-1"
                      />
                      {upload?.file && !upload.uploaded && (
                        <Button
                          onClick={() => handleUploadFile(dataSource.id)}
                          size="sm"
                          className="whitespace-nowrap"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      )}
                    </div>
                    {upload?.file && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {upload.file.name} (
                        {Math.round(upload.file.size / 1024)} KB)
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {hasAnyFiles && !allUploaded && (
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleUploadAll} className="ml-auto">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All Files
                </Button>
              </div>
            )}

            {allUploaded && hasAnyUploaded && fileUploads.length > 0 && (
              <div className="flex justify-center pt-4 border-t">
                <div className="text-center text-green-600">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">
                    All files uploaded successfully!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ready for data extraction processing
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedDataSystemId > 0 && dataSourcesLoading && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Loading data sources...
            </p>
          </CardContent>
        </Card>
      )}

      {selectedDataSystemId > 0 &&
        !dataSourcesLoading &&
        activeDataSources.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                No active data sources found in this data system
              </p>
            </CardContent>
          </Card>
        )}

      {/* Extract Button - Only show when data sources are loaded */}
      {selectedDataSystemId > 0 &&
        !dataSourcesLoading &&
        activeDataSources.length > 0 && (
          <Card>
            <CardContent className="py-6">
              <div className="flex justify-center">
                <Button
                  onClick={handleExtract}
                  disabled={!hasMasterDataSourceUploaded()}
                  size="lg"
                  className="px-8"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Extract Data
                </Button>
              </div>
              {!hasMasterDataSourceUploaded() && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Upload at least one master data source file to enable
                  extraction
                </p>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
