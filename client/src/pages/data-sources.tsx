import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DataSource, DataSystem, InsertDataSource } from "@shared/schema";
import { insertDataSourceSchema } from "@shared/schema";

interface CreateDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSystemId: number;
  editingSource?: DataSource | null;
}

function CreateDataSourceModal({ isOpen, onClose, dataSystemId, editingSource }: CreateDataSourceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertDataSource>({
    resolver: zodResolver(insertDataSourceSchema),
    defaultValues: {
      name: editingSource?.name || "",
      description: editingSource?.description || "",
      sourceType: editingSource?.sourceType || "",
      connectionString: editingSource?.connectionString || "",
      dataSystemId: dataSystemId,
      isActive: editingSource?.isActive ?? true,
    },
  });

  const createSourceMutation = useMutation({
    mutationFn: async (data: InsertDataSource) => {
      if (editingSource) {
        return apiRequest("PUT", `/api/data-sources/${editingSource.id}`, data);
      } else {
        return apiRequest("POST", "/api/data-sources", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources", dataSystemId] });
      toast({
        title: "Success",
        description: editingSource ? "Data source updated successfully" : "Data source created successfully",
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

  const onSubmit = (data: InsertDataSource) => {
    createSourceMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingSource ? "Edit Data Source" : "Create New Data Source"}</DialogTitle>
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
                    <Input placeholder="Enter data source name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sourceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter source type" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="connectionString"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection String</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter connection string" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSourceMutation.isPending}>
                {createSourceMutation.isPending ? "Saving..." : editingSource ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DataSources() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [deletingSource, setDeletingSource] = useState<DataSource | null>(null);

  const { data: dataSystems = [], isLoading: isLoadingSystems } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  const { data: dataSources = [], isLoading: isLoadingSources } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources", selectedSystemId],
    enabled: !!selectedSystemId,
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/data-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources", selectedSystemId] });
      toast({
        title: "Success",
        description: "Data source deleted successfully",
      });
      setDeletingSource(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (source: DataSource) => {
    setEditingSource(source);
    setCreateModalOpen(true);
  };

  const handleDelete = (source: DataSource) => {
    setDeletingSource(source);
  };

  const handleCreateClose = () => {
    setCreateModalOpen(false);
    setEditingSource(null);
  };

  const selectedSystem = dataSystems.find(system => system.id === selectedSystemId);

  if (isLoadingSystems) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sources</h1>
          <p className="text-muted-foreground">
            Manage data sources for your healthcare systems
          </p>
        </div>
        {selectedSystemId && (
          <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Data Source
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={selectedSystemId?.toString() || ""} onValueChange={(value) => setSelectedSystemId(Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a data system" />
            </SelectTrigger>
            <SelectContent>
              {dataSystems.map((system) => (
                <SelectItem key={system.id} value={system.id.toString()}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSystem && (
          <div className="text-sm text-muted-foreground">
            Selected: {selectedSystem.name}
          </div>
        )}
      </div>

      {!selectedSystemId ? (
        <div className="text-center py-12">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Select a data system</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Choose a data system from the dropdown above to view and manage its data sources.
            </p>
          </div>
        </div>
      ) : dataSources.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No data sources available</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              This data system doesn't have any data sources yet. Create your first one to get started.
            </p>
            <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Data Source
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((source: DataSource) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>{source.description}</TableCell>
                  <TableCell>{source.sourceType}</TableCell>
                  <TableCell>
                    <Badge variant={source.isActive ? "default" : "secondary"}>
                      {source.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(source)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(source)}
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
      )}

      {selectedSystemId && (
        <CreateDataSourceModal
          isOpen={createModalOpen}
          onClose={handleCreateClose}
          dataSystemId={selectedSystemId}
          editingSource={editingSource}
        />
      )}

      <AlertDialog open={!!deletingSource} onOpenChange={() => setDeletingSource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSource?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSource && deleteSourceMutation.mutate(deletingSource.id)}
              disabled={deleteSourceMutation.isPending}
            >
              {deleteSourceMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}