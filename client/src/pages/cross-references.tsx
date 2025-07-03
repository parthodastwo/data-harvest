import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCrossReferenceSchema, type CrossReference, type InsertCrossReference, type DataSystem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/main-layout";

interface CreateCrossReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCrossReference?: CrossReference | null;
}

function CreateCrossReferenceModal({ isOpen, onClose, editingCrossReference }: CreateCrossReferenceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editingCrossReference;

  const form = useForm<InsertCrossReference>({
    resolver: zodResolver(insertCrossReferenceSchema),
    defaultValues: {
      name: editingCrossReference?.name || "",
      dataSystemId: editingCrossReference?.dataSystemId || 0,
      isActive: editingCrossReference?.isActive ?? true,
    },
  });

  const { data: dataSystems } = useQuery({
    queryKey: ["/api/data-systems"],
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCrossReference) => {
      const response = await apiRequest(`/api/cross-references`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-references"] });
      toast({
        title: "Success",
        description: "Cross reference created successfully",
      });
      onClose();
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertCrossReference) => {
      const response = await apiRequest(`/api/cross-references/${editingCrossReference!.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-references"] });
      toast({
        title: "Success",
        description: "Cross reference updated successfully",
      });
      onClose();
      form.reset();
    },
  });

  const onSubmit = (data: InsertCrossReference) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Cross Reference" : "Create New Cross Reference"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter cross reference name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataSystemId">Data System *</Label>
            <Select
              value={form.watch("dataSystemId")?.toString()}
              onValueChange={(value) => form.setValue("dataSystemId", parseInt(value))}
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
            {form.formState.errors.dataSystemId && (
              <p className="text-sm text-red-600">{form.formState.errors.dataSystemId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="isActive">Status</Label>
            <Select
              value={form.watch("isActive")?.toString()}
              onValueChange={(value) => form.setValue("isActive", value === "true")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CrossReferences() {
  const [, setLocation] = useLocation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCrossReference, setEditingCrossReference] = useState<CrossReference | null>(null);
  const [deletingCrossReference, setDeletingCrossReference] = useState<CrossReference | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: crossReferences, isLoading } = useQuery({
    queryKey: ["/api/cross-references"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/cross-references/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-references"] });
      toast({
        title: "Success",
        description: "Cross reference deleted successfully",
      });
      setDeletingCrossReference(null);
    },
  });

  const handleEdit = (crossReference: CrossReference) => {
    setEditingCrossReference(crossReference);
    setCreateModalOpen(true);
  };

  const handleDelete = (crossReference: CrossReference) => {
    setDeletingCrossReference(crossReference);
  };

  const handleDetails = (crossReference: CrossReference) => {
    setLocation(`/cross-references/${crossReference.id}`);
  };

  const handleCreateClose = () => {
    setCreateModalOpen(false);
    setEditingCrossReference(null);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cross References</h1>
            <p className="text-muted-foreground">
              Manage cross-reference mappings between data sources
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Cross Reference
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cross References List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading cross references...</p>
              </div>
            ) : !crossReferences || crossReferences.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No cross references found. Create your first cross reference to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossReferences.map((crossReference: CrossReference) => (
                    <TableRow key={crossReference.id}>
                      <TableCell className="font-medium">{crossReference.name}</TableCell>
                      <TableCell>
                        <Badge variant={crossReference.isActive ? "default" : "secondary"}>
                          {crossReference.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(crossReference.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDetails(crossReference)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(crossReference)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(crossReference)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCrossReferenceModal
        isOpen={createModalOpen}
        onClose={handleCreateClose}
        editingCrossReference={editingCrossReference}
      />

      <AlertDialog open={!!deletingCrossReference} onOpenChange={() => setDeletingCrossReference(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cross Reference</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the cross reference "{deletingCrossReference?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCrossReference && deleteMutation.mutate(deletingCrossReference.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}