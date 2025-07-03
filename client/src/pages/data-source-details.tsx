import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
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
    <div className="p-6 space-y-6">
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
        <CardHeader>
          <CardTitle>Data Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-lg font-semibold">{dataSource.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data System</label>
              <p className="text-lg">{getDataSystemName(dataSource.dataSystemId)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Filename</label>
              <p className="text-lg font-mono">{dataSource.filename}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={dataSource.activeFlag ? "default" : "secondary"}>
                  {dataSource.activeFlag ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <div className="mt-1">
                {dataSource.isMaster ? (
                  <Badge variant="destructive">Master</Badge>
                ) : (
                  <Badge variant="outline">Standard</Badge>
                )}
              </div>
            </div>
            {dataSource.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-lg">{dataSource.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details: Attributes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attributes</CardTitle>
              <CardDescription>Manage attributes for this data source</CardDescription>
            </div>
            <Button onClick={() => setCreateAttributeModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Attribute
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAttributes ? (
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : attributes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No attributes defined for this data source</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}