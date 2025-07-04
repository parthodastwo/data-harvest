import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DataSource, DataSystem, InsertDataSource } from "@shared/schema";
import { insertDataSourceSchema } from "@shared/schema";

interface CreateDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSource?: DataSource | null;
}

function CreateDataSourceModal({
  isOpen,
  onClose,
  editingSource,
}: CreateDataSourceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertDataSource>({
    resolver: zodResolver(
      insertDataSourceSchema.extend({
        name: insertDataSourceSchema.shape.name.min(1, "Name is required"),
        filename: insertDataSourceSchema.shape.filename.min(
          1,
          "Filename is required",
        ),
        dataSystemId: insertDataSourceSchema.shape.dataSystemId.min(
          1,
          "Data system is required",
        ),
      }),
    ),
    defaultValues: {
      dataSystemId: 0,
      name: "",
      description: "",
      filename: "",
      activeFlag: true,
      isMaster: false,
    },
  });

  // Reset form values when editingSource changes
  useEffect(() => {
    if (editingSource) {
      form.reset({
        dataSystemId: editingSource.dataSystemId,
        name: editingSource.name,
        description: editingSource.description || "",
        filename: editingSource.filename,
        activeFlag: editingSource.activeFlag,
        isMaster: editingSource.isMaster,
      });
    } else {
      form.reset({
        dataSystemId: 0,
        name: "",
        description: "",
        filename: "",
        activeFlag: true,
        isMaster: false,
      });
    }
  }, [editingSource, form]);

  const { data: dataSystems = [] } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  // Filter active data systems for the dropdown
  const activeDataSystems = dataSystems.filter((system) => system.isActive);

  const createSourceMutation = useMutation({
    mutationFn: async (data: InsertDataSource) => {
      if (editingSource) {
        return apiRequest("PUT", `/api/data-sources/${editingSource.id}`, data);
      } else {
        return apiRequest("POST", "/api/data-sources", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({
        title: "Success",
        description: editingSource
          ? "Data source updated successfully"
          : "Data source created successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingSource ? "Edit Data Source" : "Create New Data Source"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dataSystemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data System</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a data system" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeDataSystems.map((system) => (
                        <SelectItem
                          key={system.id}
                          value={system.id.toString()}
                        >
                          {system.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Textarea
                      placeholder="Enter description (optional)"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="filename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Filename</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter filename" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="activeFlag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Enable this data source
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isMaster"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Master</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Mark as master source
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSourceMutation.isPending}>
                {createSourceMutation.isPending
                  ? "Saving..."
                  : editingSource
                    ? "Update"
                    : "Create"}
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
  const [, setLocation] = useLocation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [deletingSource, setDeletingSource] = useState<DataSource | null>(null);

  const { data: dataSources = [], isLoading } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources"],
  });

  const { data: dataSystems = [] } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/data-sources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({
        title: "Success",
        description: "Data source deleted successfully",
      });
      setDeletingSource(null);
    },
    onError: (error: any) => {
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

  const handleDetails = (source: DataSource) => {
    setLocation(`/data-sources/${source.id}`);
  };

  const handleCreateClose = () => {
    setCreateModalOpen(false);
    setEditingSource(null);
  };

  const getDataSystemName = (dataSystemId: number) => {
    const system = dataSystems.find((s) => s.id === dataSystemId);
    return system?.name || "Unknown";
  };

  if (isLoading) {
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
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Data Source
        </Button>
      </div>

      {dataSources.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              No data sources available
            </h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              You haven't created any data sources yet. Get started by creating
              your first one.
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
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
                <TableHead>Data System</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Master</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((source: DataSource) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>
                    {getDataSystemName(source.dataSystemId)}
                  </TableCell>
                  <TableCell>{source.description}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {source.filename}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={source.activeFlag ? "default" : "secondary"}
                    >
                      {source.activeFlag ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {source.isMaster ? (
                      <Badge variant="destructive">Master</Badge>
                    ) : (
                      <Badge variant="outline">Reference</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDetails(source)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(source)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(source)}
                        className="flex items-center gap-1"
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
      )}

      <CreateDataSourceModal
        isOpen={createModalOpen}
        onClose={handleCreateClose}
        editingSource={editingSource}
      />

      <AlertDialog
        open={!!deletingSource}
        onOpenChange={() => setDeletingSource(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSource?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingSource && deleteSourceMutation.mutate(deletingSource.id)
              }
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