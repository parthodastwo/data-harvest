import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Database, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { DataSystem, InsertDataSystem } from "@shared/schema";

interface CreateDataSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSystem?: DataSystem | null;
}

function CreateDataSystemModal({ isOpen, onClose, editingSystem }: CreateDataSystemModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [activeFlag, setActiveFlag] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (editingSystem) {
      setName(editingSystem.name);
      setDescription(editingSystem.description || "");
      setActiveFlag(editingSystem.activeFlag);
    } else {
      setName("");
      setDescription("");
      setActiveFlag(true);
    }
  }, [editingSystem, isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertDataSystem) => {
      const endpoint = editingSystem ? `/api/data-systems/${editingSystem.id}` : "/api/data-systems";
      const method = editingSystem ? "PUT" : "POST";
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems"] });
      toast({
        title: editingSystem ? "Data System Updated" : "Data System Created",
        description: `Data system ${editingSystem ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingSystem ? "update" : "create"} data system`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      activeFlag,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {editingSystem ? "Edit Data System" : "Create Data System"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter system name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="activeFlag"
              checked={activeFlag}
              onChange={(e) => setActiveFlag(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="activeFlag" className="text-sm font-medium">
              Active
            </label>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : editingSystem ? "Update" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DataSystems() {
  const [, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<DataSystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<DataSystem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: dataSystems, isLoading, error } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/data-systems/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems"] });
      toast({
        title: "Data System Deleted",
        description: "Data system deleted successfully",
      });
      setDeletingSystem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete data system",
        variant: "destructive",
      });
    },
  });

  const filteredSystems = dataSystems?.filter((system: DataSystem) =>
    system.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    system.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleEdit = (system: DataSystem) => {
    setEditingSystem(system);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (system: DataSystem) => {
    setDeletingSystem(system);
  };

  const confirmDelete = () => {
    if (deletingSystem) {
      deleteMutation.mutate(deletingSystem.id);
    }
  };



  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Error loading data systems: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Systems</h1>
          <p className="text-gray-600">Manage healthcare data systems and their sources</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Data System</span>
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search data systems..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary">
          {filteredSystems.length} system{filteredSystems.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSystems.map((system: DataSystem) => (
          <Card key={system.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{system.name}</CardTitle>
                </div>
                <Badge variant={system.activeFlag ? "default" : "secondary"}>
                  {system.activeFlag ? "Active" : "Inactive"}
                </Badge>
              </div>
              {system.description && (
                <CardDescription className="line-clamp-2">
                  {system.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Created: {new Date(system.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(system)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(system)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSystems.length === 0 && (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data systems found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "No systems match your search." : "Get started by creating your first data system."}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Data System
            </Button>
          )}
        </div>
      )}

      <CreateDataSystemModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSystem(null);
        }}
        editingSystem={editingSystem}
      />

      <AlertDialog open={!!deletingSystem} onOpenChange={() => setDeletingSystem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data System</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSystem?.name}"? This action cannot be undone and will also delete all associated data sources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}