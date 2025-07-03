import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Edit, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DataSource, DataSystem, DataSourceAttribute, InsertDataSourceAttribute } from "@shared/schema";
import { insertDataSourceAttributeSchema } from "@shared/schema";

interface CreateAttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSourceId: number;
  editingAttribute?: DataSourceAttribute | null;
}

function CreateAttributeModal({ isOpen, onClose, dataSourceId, editingAttribute }: CreateAttributeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertDataSourceAttribute>({
    resolver: zodResolver(insertDataSourceAttributeSchema.extend({
      name: insertDataSourceAttributeSchema.shape.name.min(1, "Name is required"),
    })),
    defaultValues: {
      dataSourceId: dataSourceId,
      name: "",
      dataType: "none",
      format: "",
    },
  });

  // Reset form values when editingAttribute changes
  useEffect(() => {
    if (editingAttribute) {
      form.reset({
        dataSourceId: editingAttribute.dataSourceId,
        name: editingAttribute.name,
        dataType: editingAttribute.dataType || "none",
        format: editingAttribute.format || "",
      });
    } else {
      form.reset({
        dataSourceId: dataSourceId,
        name: "",
        dataType: "none",
        format: "",
      });
    }
  }, [editingAttribute, dataSourceId, form]);

  const createAttributeMutation = useMutation({
    mutationFn: async (data: InsertDataSourceAttribute) => {
      if (editingAttribute) {
        return apiRequest("PUT", `/api/data-source-attributes/${editingAttribute.id}`, data);
      } else {
        return apiRequest("POST", `/api/data-sources/${dataSourceId}/attributes`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources", dataSourceId, "attributes"] });
      toast({
        title: "Success",
        description: editingAttribute ? "Attribute updated successfully" : "Attribute created successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDataSourceAttribute) => {
    createAttributeMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="attribute-dialog-description">
        <DialogHeader>
          <DialogTitle>{editingAttribute ? "Edit Attribute" : "Create New Attribute"}</DialogTitle>
          <div id="attribute-dialog-description" className="sr-only">
            {editingAttribute ? "Edit attribute details" : "Add a new attribute to the data source"}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter attribute name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Type</FormLabel>
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., MM/DD/YYYY (optional)" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAttributeMutation.isPending}>
                {createAttributeMutation.isPending ? "Saving..." : editingAttribute ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DataSourceDetails() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createAttributeModalOpen, setCreateAttributeModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<DataSourceAttribute | null>(null);
  const [deletingAttribute, setDeletingAttribute] = useState<DataSourceAttribute | null>(null);

  // Extract ID from the current location path
  const dataSourceId = location.split('/').pop() ? parseInt(location.split('/').pop()!) : 0;

  const { data: dataSource, isLoading: isLoadingSource } = useQuery<DataSource>({
    queryKey: ["/api/data-sources", dataSourceId],
    queryFn: async () => {
      const response = await fetch(`/api/data-sources/${dataSourceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("health_data_harvest_token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch data source");
      }
      return response.json();
    },
    enabled: !!dataSourceId,
  });

  const { data: dataSystems = [] } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  const { data: attributes = [], isLoading: isLoadingAttributes } = useQuery<DataSourceAttribute[]>({
    queryKey: ["/api/data-sources", dataSourceId, "attributes"],
    queryFn: async () => {
      const response = await fetch(`/api/data-sources/${dataSourceId}/attributes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("health_data_harvest_token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch attributes");
      }
      return response.json();
    },
    enabled: !!dataSourceId,
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/data-source-attributes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources", dataSourceId, "attributes"] });
      toast({
        title: "Success",
        description: "Attribute deleted successfully",
      });
      setDeletingAttribute(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleEditAttribute = (attribute: DataSourceAttribute) => {
    setEditingAttribute(attribute);
    setCreateAttributeModalOpen(true);
  };

  const handleDeleteAttribute = (attribute: DataSourceAttribute) => {
    setDeletingAttribute(attribute);
  };

  const handleCreateAttributeClose = () => {
    setCreateAttributeModalOpen(false);
    setEditingAttribute(null);
  };

  const getDataSystemName = (dataSystemId: number) => {
    const system = dataSystems.find(s => s.id === dataSystemId);
    return system?.name || "Unknown";
  };

  // CSV parsing helper functions
  const inferDataType = (value: string): string => {
    // Remove whitespace
    const trimmed = value.trim();
    
    // Check if empty
    if (!trimmed) return "string";
    
    // Check for number
    if (!isNaN(Number(trimmed)) && !isNaN(parseFloat(trimmed))) {
      return "number";
    }
    
    // Check for date patterns
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,     // MM/DD/YYYY or M/D/YYYY
      /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
      /^\d{2}-\d{2}-\d{4}$/,           // MM-DD-YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/,       // M-D-YYYY
    ];
    
    for (const pattern of datePatterns) {
      if (pattern.test(trimmed)) {
        return "date";
      }
    }
    
    return "string";
  };

  const detectDateFormat = (value: string): string | null => {
    const trimmed = value.trim();
    
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      return "MM/DD/YYYY";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return "YYYY-MM-DD";
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return "MM-DD-YYYY";
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
      return "M-D-YYYY";
    }
    
    return null;
  };

  const parseCSV = (csvText: string): { headers: string[], firstRow: string[] } => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("CSV must have at least 2 rows (header + data)");
    }
    
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    const firstRow = parseCSVLine(lines[1]);
    
    return { headers, firstRow };
  };

  const csvUploadMutation = useMutation({
    mutationFn: async (attributes: InsertDataSourceAttribute[]) => {
      const promises = attributes.map(attr => 
        apiRequest("POST", `/api/data-sources/${dataSourceId}/attributes`, attr)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources", dataSourceId, "attributes"] });
      toast({
        title: "Success",
        description: "Attributes created from CSV successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const { headers, firstRow } = parseCSV(csvText);
        
        if (headers.length !== firstRow.length) {
          throw new Error("Header count doesn't match data count");
        }
        
        const attributesToCreate: InsertDataSourceAttribute[] = headers.map((header, index) => {
          const value = firstRow[index] || "";
          const dataType = inferDataType(value);
          const format = dataType === "date" ? detectDateFormat(value) : null;
          
          return {
            dataSourceId: dataSourceId!,
            name: header.trim(),
            dataType: dataType || undefined,
            format: format || undefined,
          };
        });
        
        csvUploadMutation.mutate(attributesToCreate);
      } catch (error) {
        toast({
          title: "Error parsing CSV",
          description: error instanceof Error ? error.message : "Invalid CSV format",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
    
    // Clear the input
    event.target.value = '';
  };

  if (!dataSourceId) {
    return <div>Data source not found</div>;
  }

  if (isLoadingSource) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!dataSource) {
    return <div className="p-6">Data source not found</div>;
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/data-sources")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Data Source Details</h1>
                <p className="text-muted-foreground">
                  View and manage attributes for this data source
                </p>
              </div>
            </div>
          </div>

          {/* Master: Data Source Information */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold mt-1">{dataSource.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <div className="mt-1">
                    {dataSource.isMaster ? (
                      <Badge variant="destructive">Master</Badge>
                    ) : (
                      <Badge variant="outline">Reference</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scrollable Attributes Section */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attributes</CardTitle>
                  <CardDescription>Manage attributes for this data source</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setCreateAttributeModalOpen(true)} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Attribute
                  </Button>
                  <div className="relative">
                    <Button variant="outline" className="flex items-center gap-2" disabled={csvUploadMutation.isPending}>
                      <Upload className="h-4 w-4" />
                      Add Attribute - CSV Upload
                    </Button>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={csvUploadMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {isLoadingAttributes ? (
                <div className="space-y-4 p-6">
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : attributes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No attributes defined for this data source</p>
                </div>
              ) : (
                <div className="border-t h-full">
                  <div className="h-full overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="bg-white">Name</TableHead>
                          <TableHead className="bg-white">Data Type</TableHead>
                          <TableHead className="bg-white">Format</TableHead>
                          <TableHead className="text-right bg-white">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attributes.map((attribute: DataSourceAttribute) => (
                          <TableRow key={attribute.id}>
                            <TableCell className="font-medium">{attribute.name}</TableCell>
                            <TableCell>
                              {attribute.dataType ? (
                                <Badge variant="outline">{attribute.dataType}</Badge>
                              ) : (
                                <span className="text-muted-foreground">Not specified</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {attribute.format || <span className="text-muted-foreground">Not specified</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditAttribute(attribute)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteAttribute(attribute)}
                                  className="flex items-center gap-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateAttributeModal
        isOpen={createAttributeModalOpen}
        onClose={handleCreateAttributeClose}
        dataSourceId={dataSourceId}
        editingAttribute={editingAttribute}
      />

      <AlertDialog open={!!deletingAttribute} onOpenChange={() => setDeletingAttribute(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attribute</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the attribute "{deletingAttribute?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAttribute && deleteAttributeMutation.mutate(deletingAttribute.id)}
              disabled={deleteAttributeMutation.isPending}
            >
              {deleteAttributeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}