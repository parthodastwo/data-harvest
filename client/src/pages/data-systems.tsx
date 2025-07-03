import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DataSystem, InsertDataSystem } from "@shared/schema";
import { insertDataSystemSchema } from "@shared/schema";

interface CreateDataSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSystem?: DataSystem | null;
}

function CreateDataSystemModal({ isOpen, onClose, editingSystem }: CreateDataSystemModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertDataSystem>({
    resolver: zodResolver(insertDataSystemSchema.extend({
      name: insertDataSystemSchema.shape.name.min(1, "Name is required"),
    })),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Reset form values when editingSystem changes
  useEffect(() => {
    if (editingSystem) {
      form.reset({
        name: editingSystem.name,
        description: editingSystem.description || "",
        isActive: editingSystem.isActive,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        isActive: true,
      });
    }
  }, [editingSystem, form]);

  const createSystemMutation = useMutation({
    mutationFn: async (data: InsertDataSystem) => {
      if (editingSystem) {
        return apiRequest("PUT", `/api/data-systems/${editingSystem.id}`, data);
      } else {
        return apiRequest("POST", "/api/data-systems", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems"] });
      toast({
        title: "Success",
        description: editingSystem ? "Data system updated successfully" : "Data system created successfully",
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

  const onSubmit = (data: InsertDataSystem) => {
    createSystemMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingSystem ? "Edit Data System" : "Create New Data System"}</DialogTitle>
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
                    <Input placeholder="Enter data system name" {...field} />
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
                    <Textarea placeholder="Enter description" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
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
                      Enable this data system for use
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSystemMutation.isPending}>
                {createSystemMutation.isPending ? "Saving..." : editingSystem ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DataSystems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<DataSystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<DataSystem | null>(null);

  const { data: dataSystems = [], isLoading } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  const deleteSystemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/data-systems/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems"] });
      toast({
        title: "Success",
        description: "Data system deleted successfully",
      });
      setDeletingSystem(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (system: DataSystem) => {
    setEditingSystem(system);
    setCreateModalOpen(true);
  };

  const handleDelete = (system: DataSystem) => {
    setDeletingSystem(system);
  };

  const handleCreateClose = () => {
    setCreateModalOpen(false);
    setEditingSystem(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Data Systems</h1>
          <p className="text-muted-foreground">
            Manage your healthcare data systems
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Data System
        </Button>
      </div>

      {dataSystems.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No data systems available</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              You haven't created any data systems yet. Get started by creating your first one.
            </p>
            <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Data System
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSystems.map((system: DataSystem) => (
                <TableRow key={system.id}>
                  <TableCell className="font-medium">{system.name}</TableCell>
                  <TableCell>{system.description}</TableCell>
                  <TableCell>
                    <Badge variant={system.isActive ? "default" : "secondary"}>
                      {system.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(system)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(system)}
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

      <CreateDataSystemModal
        isOpen={createModalOpen}
        onClose={handleCreateClose}
        editingSystem={editingSystem}
      />

      <AlertDialog open={!!deletingSystem} onOpenChange={() => setDeletingSystem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data System</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSystem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSystem && deleteSystemMutation.mutate(deletingSystem.id)}
              disabled={deleteSystemMutation.isPending}
            >
              {deleteSystemMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}