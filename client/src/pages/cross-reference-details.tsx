import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCrossReferenceMappingSchema, type CrossReference, type CrossReferenceMapping, type InsertCrossReferenceMapping, type DataSource, type DataSourceAttribute } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";


const createMappingSchema = insertCrossReferenceMappingSchema.omit({ crossReferenceId: true });

interface CreateMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  crossReferenceId: number;
  editingMapping?: CrossReferenceMapping | null;
}

function CreateMappingModal({ isOpen, onClose, crossReferenceId, editingMapping }: CreateMappingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editingMapping;

  const form = useForm<z.infer<typeof createMappingSchema>>({
    resolver: zodResolver(createMappingSchema),
    defaultValues: {
      sourceDataSourceId: 0,
      sourceAttributeId: 0,
      targetDataSourceId: 0,
      targetAttributeId: 0,
    },
  });

  // Update form values when editingMapping changes
  useEffect(() => {
    console.log("useEffect triggered - editingMapping:", editingMapping, "isOpen:", isOpen);
    if (editingMapping) {
      console.log("Setting form values for editing mapping:", editingMapping);
      form.reset({
        sourceDataSourceId: editingMapping.sourceDataSourceId,
        sourceAttributeId: editingMapping.sourceAttributeId,
        targetDataSourceId: editingMapping.targetDataSourceId,
        targetAttributeId: editingMapping.targetAttributeId,
      });
      // Manually invalidate attribute queries to ensure they reload with the new data source IDs
      setTimeout(() => {
        console.log("Invalidating attribute queries for sources:", editingMapping.sourceDataSourceId, editingMapping.targetDataSourceId);
        queryClient.invalidateQueries({ queryKey: ["/api/data-sources", editingMapping.sourceDataSourceId, "attributes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/data-sources", editingMapping.targetDataSourceId, "attributes"] });
      }, 100);
    } else {
      console.log("Resetting form to default values");
      form.reset({
        sourceDataSourceId: 0,
        sourceAttributeId: 0,
        targetDataSourceId: 0,
        targetAttributeId: 0,
      });
    }
  }, [editingMapping, form, queryClient, isOpen]);

  const { data: crossReference } = useQuery<CrossReference>({
    queryKey: ["/api/cross-references", crossReferenceId],
    enabled: !!crossReferenceId,
  });

  const { data: allDataSources } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources"],
  });

  const { data: sourceDataSources } = useQuery<DataSource[]>({
    queryKey: ["/api/data-systems", crossReference?.dataSystemId, "data-sources"],
    queryFn: async () => {
      if (!crossReference?.dataSystemId) return [];
      const response = await apiRequest("GET", `/api/data-systems/${crossReference.dataSystemId}/data-sources`);
      return response.json();
    },
    enabled: !!crossReference?.dataSystemId,
  });

  const { data: sourceAttributes } = useQuery<DataSourceAttribute[]>({
    queryKey: ["/api/data-sources", form.watch("sourceDataSourceId"), "attributes"],
    queryFn: async () => {
      const sourceId = form.watch("sourceDataSourceId");
      console.log("Loading source attributes for data source ID:", sourceId);
      if (!sourceId || sourceId === 0) return [];
      const response = await apiRequest("GET", `/api/data-sources/${sourceId}/attributes`);
      return response.json();
    },
    enabled: isOpen && !!form.watch("sourceDataSourceId") && form.watch("sourceDataSourceId") > 0,
  });

  const { data: targetAttributes } = useQuery<DataSourceAttribute[]>({
    queryKey: ["/api/data-sources", form.watch("targetDataSourceId"), "attributes"],
    queryFn: async () => {
      const targetId = form.watch("targetDataSourceId");
      console.log("Loading target attributes for data source ID:", targetId);
      if (!targetId || targetId === 0) return [];
      const response = await apiRequest("GET", `/api/data-sources/${targetId}/attributes`);
      return response.json();
    },
    enabled: isOpen && !!form.watch("targetDataSourceId") && form.watch("targetDataSourceId") > 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createMappingSchema>) => {
      const response = await apiRequest("POST", `/api/cross-references/${crossReferenceId}/mappings`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-references", crossReferenceId, "mappings"] });
      toast({
        title: "Success",
        description: "Cross reference mapping created successfully",
      });
      onClose();
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createMappingSchema>) => {
      const response = await apiRequest("PUT", `/api/cross-references/${crossReferenceId}/mappings/${editingMapping!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-references", crossReferenceId, "mappings"] });
      toast({
        title: "Success",
        description: "Cross reference mapping updated successfully",
      });
      onClose();
      form.reset();
    },
  });

  const onSubmit = (data: z.infer<typeof createMappingSchema>) => {
    // Validate that source and target data sources are not the same
    if (data.sourceDataSourceId === data.targetDataSourceId) {
      form.setError("targetDataSourceId", {
        message: "Source and target data sources cannot be the same",
      });
      return;
    }

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Debug logging for form values and attributes
  useEffect(() => {
    if (isOpen) {
      console.log("Form values:", {
        sourceDataSourceId: form.watch("sourceDataSourceId"),
        sourceAttributeId: form.watch("sourceAttributeId"),
        targetDataSourceId: form.watch("targetDataSourceId"),
        targetAttributeId: form.watch("targetAttributeId")
      });
      console.log("Attributes:", {
        sourceAttributes: sourceAttributes?.length || 0,
        targetAttributes: targetAttributes?.length || 0
      });
    }
  }, [isOpen, form.watch("sourceDataSourceId"), form.watch("sourceAttributeId"), form.watch("targetDataSourceId"), form.watch("targetAttributeId"), sourceAttributes, targetAttributes]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Cross Reference Mapping" : "Add Cross Reference Mapping"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Source</h3>
              <div className="space-y-2">
                <Label htmlFor="sourceDataSourceId">Data Source *</Label>
                <Select
                  value={form.watch("sourceDataSourceId") > 0 ? form.watch("sourceDataSourceId").toString() : ""}
                  onValueChange={(value) => {
                    form.setValue("sourceDataSourceId", parseInt(value));
                    form.setValue("sourceAttributeId", 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceDataSources?.filter((ds: DataSource) => ds.activeFlag).map((source: DataSource) => (
                      <SelectItem key={source.id} value={source.id.toString()}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.sourceDataSourceId && (
                  <p className="text-sm text-red-600">{form.formState.errors.sourceDataSourceId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceAttributeId">Attribute *</Label>
                <Select
                  value={form.watch("sourceAttributeId") > 0 ? form.watch("sourceAttributeId").toString() : ""}
                  onValueChange={(value) => form.setValue("sourceAttributeId", parseInt(value))}
                  disabled={!form.watch("sourceDataSourceId")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source attribute" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceAttributes?.map((attribute: DataSourceAttribute) => (
                      <SelectItem key={attribute.id} value={attribute.id.toString()}>
                        {attribute.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.sourceAttributeId && (
                  <p className="text-sm text-red-600">{form.formState.errors.sourceAttributeId.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Target</h3>
              <div className="space-y-2">
                <Label htmlFor="targetDataSourceId">Data Source *</Label>
                <Select
                  value={form.watch("targetDataSourceId") > 0 ? form.watch("targetDataSourceId").toString() : ""}
                  onValueChange={(value) => {
                    form.setValue("targetDataSourceId", parseInt(value));
                    form.setValue("targetAttributeId", 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target data source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceDataSources?.filter((ds: DataSource) => 
                      ds.activeFlag && ds.id !== form.watch("sourceDataSourceId")
                    ).map((source: DataSource) => (
                      <SelectItem key={source.id} value={source.id.toString()}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.targetDataSourceId && (
                  <p className="text-sm text-red-600">{form.formState.errors.targetDataSourceId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAttributeId">Attribute *</Label>
                <Select
                  value={form.watch("targetAttributeId") > 0 ? form.watch("targetAttributeId").toString() : ""}
                  onValueChange={(value) => form.setValue("targetAttributeId", parseInt(value))}
                  disabled={!form.watch("targetDataSourceId")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target attribute" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetAttributes?.map((attribute: DataSourceAttribute) => (
                      <SelectItem key={attribute.id} value={attribute.id.toString()}>
                        {attribute.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.targetAttributeId && (
                  <p className="text-sm text-red-600">{form.formState.errors.targetAttributeId.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? "Update" : "Add Mapping"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CrossReferenceDetails() {
  const [location, setLocation] = useLocation();
  const [createMappingModalOpen, setCreateMappingModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CrossReferenceMapping | null>(null);
  const [deletingMapping, setDeletingMapping] = useState<CrossReferenceMapping | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract cross reference ID from URL
  const crossReferenceId = parseInt(location.split("/").pop() || "0");

  console.log("Cross Reference Details - ID:", crossReferenceId, "Location:", location);

  const { data: crossReference, isLoading: crossReferenceLoading } = useQuery<CrossReference>({
    queryKey: ["/api/cross-references", crossReferenceId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/cross-references/${crossReferenceId}`);
      return response.json();
    },
    enabled: !!crossReferenceId && crossReferenceId > 0,
  });

  const { data: mappings, isLoading: mappingsLoading } = useQuery<CrossReferenceMapping[]>({
    queryKey: ["/api/cross-references", crossReferenceId, "mappings"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/cross-references/${crossReferenceId}/mappings`);
      return response.json();
    },
    enabled: !!crossReferenceId && crossReferenceId > 0,
  });

  const { data: allDataSources } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources"],
  });

  const { data: allAttributes } = useQuery<DataSourceAttribute[]>({
    queryKey: ["/api/data-source-attributes"],
    queryFn: async () => {
      if (!allDataSources) return [];
      const allAttrs = [];
      for (const ds of allDataSources) {
        const response = await apiRequest("GET", `/api/data-sources/${ds.id}/attributes`);
        const attrs = await response.json();
        allAttrs.push(...attrs);
      }
      return allAttrs;
    },
    enabled: !!allDataSources,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/cross-references/${crossReferenceId}/mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-references", crossReferenceId, "mappings"] });
      toast({
        title: "Success",
        description: "Cross reference mapping deleted successfully",
      });
      setDeletingMapping(null);
    },
  });

  const handleEditMapping = (mapping: CrossReferenceMapping) => {
    console.log("Edit mapping clicked with data:", mapping);
    setEditingMapping(mapping);
    setCreateMappingModalOpen(true);
  };

  const handleDeleteMapping = (mapping: CrossReferenceMapping) => {
    setDeletingMapping(mapping);
  };

  const handleCreateMappingClose = () => {
    setCreateMappingModalOpen(false);
    setEditingMapping(null);
  };

  const getDataSourceName = (id: number) => {
    return allDataSources?.find((ds: DataSource) => ds.id === id)?.name || "Unknown";
  };

  const getAttributeName = (id: number) => {
    return allAttributes?.find((attr: DataSourceAttribute) => attr.id === id)?.name || "Unknown";
  };

  if (crossReferenceLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading cross reference...</p>
      </div>
    );
  }

  if (!crossReference) {
    return (
      <div className="p-6">
        <p className="text-red-600">Cross reference not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/cross-references")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cross Reference Details</h1>
              <p className="text-muted-foreground">
                View and manage mappings for this cross reference
              </p>
            </div>
          </div>
        </div>

        {/* Master: Cross Reference Information */}
        <Card>
          <CardContent className="py-4">
            {crossReference ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold mt-1">{crossReference.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={crossReference.isActive ? "default" : "secondary"}>
                      {crossReference.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading cross reference details...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scrollable Mappings Section */}
        <Card className="flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '200px' }}>
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cross Reference Mappings</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Define attribute mappings between source and target data sources
                </p>
              </div>
              <Button
                onClick={() => setCreateMappingModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Mapping
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden px-6 pb-6">
            {mappingsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading mappings...</p>
              </div>
            ) : !mappings || mappings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No mappings defined for this cross reference</p>
              </div>
            ) : (
              <div className="border-t h-full">
                <div className="h-full overflow-y-scroll">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="bg-white">Source Data Source</TableHead>
                        <TableHead className="bg-white">Source Attribute</TableHead>
                        <TableHead className="bg-white">Target Data Source</TableHead>
                        <TableHead className="bg-white">Target Attribute</TableHead>
                        <TableHead className="text-right bg-white">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((mapping: CrossReferenceMapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell className="font-medium">
                            {getDataSourceName(mapping.sourceDataSourceId)}
                          </TableCell>
                          <TableCell>{getAttributeName(mapping.sourceAttributeId)}</TableCell>
                          <TableCell className="font-medium">
                            {getDataSourceName(mapping.targetDataSourceId)}
                          </TableCell>
                          <TableCell>{getAttributeName(mapping.targetAttributeId)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditMapping(mapping)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteMapping(mapping)}
                              >
                                <Trash2 className="h-4 w-4" />
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

      <CreateMappingModal
        isOpen={createMappingModalOpen}
        onClose={handleCreateMappingClose}
        crossReferenceId={crossReferenceId}
        editingMapping={editingMapping}
      />

      <AlertDialog open={!!deletingMapping} onOpenChange={() => setDeletingMapping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cross Reference Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mapping? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMapping && deleteMutation.mutate(deletingMapping.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}