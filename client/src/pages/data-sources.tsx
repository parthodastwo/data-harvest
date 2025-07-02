import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, File, Database } from "lucide-react";
import { DataSource, DataSystem, InsertDataSource } from "@shared/schema";

interface CreateDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSystemId: number;
  editingSource?: DataSource | null;
}

function CreateDataSourceModal({ isOpen, onClose, dataSystemId, editingSource }: CreateDataSourceModalProps) {
  const [name, setName] = useState("");
  const [filename, setFilename] = useState("");
  const [description, setDescription] = useState("");
  const [activeFlag, setActiveFlag] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [attributes, setAttributes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (editingSource) {
      setName(editingSource.name);
      setFilename(editingSource.filename);
      setDescription(editingSource.description || "");
      setActiveFlag(editingSource.activeFlag);
      setIsMaster(editingSource.isMaster);
      setAttributes(Array.isArray(editingSource.attributes) ? editingSource.attributes.join(", ") : editingSource.attributes || "");
    } else {
      setName("");
      setFilename("");
      setDescription("");
      setActiveFlag(true);
      setIsMaster(false);
      setAttributes("");
    }
  }, [editingSource, isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertDataSource) => {
      const endpoint = editingSource ? `/api/data-sources/${editingSource.id}` : "/api/data-sources";
      const method = editingSource ? "PUT" : "POST";
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems", dataSystemId, "data-sources"] });
      toast({
        title: editingSource ? "Data Source Updated" : "Data Source Created",
        description: `Data source ${editingSource ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingSource ? "update" : "create"} data source`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !filename.trim()) {
      toast({
        title: "Error",
        description: "Name and filename are required",
        variant: "destructive",
      });
      return;
    }

    const attributesList = attributes.trim() 
      ? attributes.split(",").map(attr => attr.trim()).filter(attr => attr.length > 0)
      : [];

    createMutation.mutate({
      dataSystemId,
      name: name.trim(),
      filename: filename.trim(),
      description: description.trim() || undefined,
      activeFlag,
      isMaster,
      attributes: attributesList.join(","), // Store as comma-separated string
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {editingSource ? "Edit Data Source" : "Create Data Source"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter source name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Filename *</label>
            <Input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename (e.g., patients.csv)"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description (optional)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Attributes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
              placeholder="Enter comma-separated attributes (e.g., patient_id, name, dob, gender)"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple attributes with commas</p>
          </div>
          <div className="flex items-center space-x-4">
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isMaster"
                checked={isMaster}
                onChange={(e) => setIsMaster(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isMaster" className="text-sm font-medium">
                Master Source
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : editingSource ? "Update" : "Create"}
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

export default function DataSources() {
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [deletingSource, setDeletingSource] = useState<DataSource | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch all data systems for the dropdown
  const { data: dataSystems } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  // Fetch data sources for the selected system
  const { data: dataSources, isLoading, error } = useQuery<DataSource[]>({
    queryKey: ["/api/data-systems", selectedSystemId, "data-sources"],
    enabled: !!selectedSystemId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/data-sources/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems", selectedSystemId, "data-sources"] });
      toast({
        title: "Data Source Deleted",
        description: "Data source deleted successfully",
      });
      setDeletingSource(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete data source",
        variant: "destructive",
      });
    },
  });

  const filteredSources = dataSources?.filter((source: DataSource) =>
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleEdit = (source: DataSource) => {
    setEditingSource(source);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (source: DataSource) => {
    setDeletingSource(source);
  };

  const confirmDelete = () => {
    if (deletingSource) {
      deleteMutation.mutate(deletingSource.id);
    }
  };

  const selectedSystem = dataSystems?.find(system => system.id === selectedSystemId);

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
          Error loading data sources: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <File className="h-6 w-6 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Data Sources</h1>
          </div>
          <p className="text-gray-600">
            Manage data sources for healthcare systems
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)} 
          className="flex items-center space-x-2"
          disabled={!selectedSystemId}
        >
          <Plus className="h-4 w-4" />
          <span>Add Data Source</span>
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Data System:</label>
          <Select value={selectedSystemId?.toString() || ""} onValueChange={(value) => setSelectedSystemId(parseInt(value))}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a data system" />
            </SelectTrigger>
            <SelectContent>
              {dataSystems?.map((system) => (
                <SelectItem key={system.id} value={system.id.toString()}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedSystemId && (
          <>
            <Input
              placeholder="Search data sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Badge variant="secondary">
              {filteredSources.length} source{filteredSources.length !== 1 ? 's' : ''}
            </Badge>
          </>
        )}
      </div>

      {!selectedSystemId ? (
        <div className="text-center py-12">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Data System</h3>
          <p className="text-gray-600">
            Choose a data system from the dropdown above to view and manage its data sources.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSources.map((source: DataSource) => {
          const attributesList = typeof source.attributes === 'string' 
            ? source.attributes.split(',').map(attr => attr.trim()).filter(attr => attr.length > 0)
            : Array.isArray(source.attributes) 
            ? source.attributes 
            : [];
          
          return (
            <Card key={source.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <File className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge variant={source.activeFlag ? "default" : "secondary"}>
                      {source.activeFlag ? "Active" : "Inactive"}
                    </Badge>
                    {source.isMaster && (
                      <Badge variant="outline" className="text-xs">
                        Master
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">File:</span> {source.filename}
                  </div>
                  {source.description && (
                    <CardDescription className="line-clamp-2">
                      {source.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {attributesList.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-500 mb-1">Attributes:</div>
                    <div className="flex flex-wrap gap-1">
                      {attributesList.slice(0, 3).map((attr, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {attr}
                        </Badge>
                      ))}
                      {attributesList.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{attributesList.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Created: {new Date(source.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(source)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(source)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {selectedSystemId && filteredSources.length === 0 && (
        <div className="text-center py-12">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data sources found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "No sources match your search." : "Get started by creating your first data source."}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>
          )}
        </div>
      )}

      <CreateDataSourceModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSource(null);
        }}
        dataSystemId={selectedSystemId || 0}
        editingSource={editingSource}
      />

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