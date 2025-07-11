
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type {
  DataSystem,
  DataSource,
  DataSourceAttribute,
} from "@shared/schema";

interface FilterCondition {
  id: number;
  dataSystemId: number;
  dataSystemName: string;
  name: string;
  dataSourceId: number;
  dataSourceName: string;
  attributeId: number;
  attributeName: string;
  operator: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

interface FilterConditionFormData {
  dataSystemId: string;
  name: string;
  dataSourceId: string;
  attributeId: string;
  operator: string;
  value: string;
}

const initialFormData: FilterConditionFormData = {
  dataSystemId: "",
  name: "",
  dataSourceId: "",
  attributeId: "",
  operator: "",
  value: "",
};

export default function FilterConditions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<FilterCondition | null>(null);
  const [deletingCondition, setDeletingCondition] = useState<FilterCondition | null>(null);
  const [formData, setFormData] = useState<FilterConditionFormData>(initialFormData);

  // Queries
  const { data: filterConditions, isLoading } = useQuery<FilterCondition[]>({
    queryKey: ["/api/filter-conditions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/filter-conditions");
      return response.json();
    },
  });

  const { data: dataSystems } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  const { data: dataSources } = useQuery<DataSource[]>({
    queryKey: ["/api/data-systems", formData.dataSystemId, "data-sources"],
    queryFn: async () => {
      if (!formData.dataSystemId) return [];
      const response = await apiRequest(
        "GET",
        `/api/data-systems/${formData.dataSystemId}/data-sources`,
      );
      return response.json();
    },
    enabled: !!formData.dataSystemId,
  });

  const { data: attributes } = useQuery<DataSourceAttribute[]>({
    queryKey: ["/api/data-sources", formData.dataSourceId, "attributes"],
    queryFn: async () => {
      if (!formData.dataSourceId) return [];
      const response = await apiRequest(
        "GET",
        `/api/data-sources/${formData.dataSourceId}/attributes`,
      );
      return response.json();
    },
    enabled: !!formData.dataSourceId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/filter-conditions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-conditions"] });
      setIsCreateModalOpen(false);
      setFormData(initialFormData);
      toast({
        title: "Success",
        description: "Filter condition created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create filter condition",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/filter-conditions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-conditions"] });
      setEditingCondition(null);
      setFormData(initialFormData);
      toast({
        title: "Success",
        description: "Filter condition updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update filter condition",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/filter-conditions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-conditions"] });
      setDeletingCondition(null);
      toast({
        title: "Success",
        description: "Filter condition deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete filter condition",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreate = () => {
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (condition: FilterCondition) => {
    setFormData({
      dataSystemId: condition.dataSystemId.toString(),
      name: condition.name,
      dataSourceId: condition.dataSourceId.toString(),
      attributeId: condition.attributeId.toString(),
      operator: condition.operator,
      value: condition.value,
    });
    setEditingCondition(condition);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      dataSystemId: parseInt(formData.dataSystemId),
      name: formData.name,
      dataSourceId: parseInt(formData.dataSourceId),
      attributeId: parseInt(formData.attributeId),
      operator: formData.operator,
      value: formData.value,
    };

    if (editingCondition) {
      updateMutation.mutate({ id: editingCondition.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (condition: FilterCondition) => {
    setDeletingCondition(condition);
  };

  const confirmDelete = () => {
    if (deletingCondition) {
      deleteMutation.mutate(deletingCondition.id);
    }
  };

  const handleClose = () => {
    setIsCreateModalOpen(false);
    setEditingCondition(null);
    setFormData(initialFormData);
  };

  // Reset dependent fields when parent selections change
  useEffect(() => {
    if (!editingCondition) {
      setFormData(prev => ({ ...prev, dataSourceId: "", attributeId: "" }));
    }
  }, [formData.dataSystemId]);

  useEffect(() => {
    if (!editingCondition) {
      setFormData(prev => ({ ...prev, attributeId: "" }));
    }
  }, [formData.dataSourceId]);

  const operators = [
    { value: "=", label: "= (equal to)" },
    { value: ">", label: "> (greater than)" },
    { value: "<", label: "< (less than)" },
  ];

  const activeDataSources = dataSources?.filter(ds => ds.activeFlag) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Filter Conditions</h1>
          <p className="text-muted-foreground">
            Manage filter conditions for data extraction
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Filter Condition
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : filterConditions?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No filter conditions found. Create your first filter condition to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Data System</TableHead>
                  <TableHead>Data Source</TableHead>
                  <TableHead>Attribute</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterConditions?.map((condition) => (
                  <TableRow key={condition.id}>
                    <TableCell className="font-medium">{condition.name}</TableCell>
                    <TableCell>{condition.dataSystemName}</TableCell>
                    <TableCell>{condition.dataSourceName}</TableCell>
                    <TableCell>{condition.attributeName}</TableCell>
                    <TableCell>{condition.operator}</TableCell>
                    <TableCell>{condition.value}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(condition)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(condition)}
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

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || !!editingCondition} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCondition ? "Edit Filter Condition" : "Create Filter Condition"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="dataSystem">Data System *</Label>
              <Select
                value={formData.dataSystemId}
                onValueChange={(value) =>
                  setFormData({ ...formData, dataSystemId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data system" />
                </SelectTrigger>
                <SelectContent>
                  {dataSystems
                    ?.filter((ds) => ds.isActive)
                    .map((system) => (
                      <SelectItem key={system.id} value={system.id.toString()}>
                        {system.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter filter condition name"
                required
              />
            </div>

            <div>
              <Label htmlFor="dataSource">Data Source *</Label>
              <Select
                value={formData.dataSourceId}
                onValueChange={(value) =>
                  setFormData({ ...formData, dataSourceId: value })
                }
                disabled={!formData.dataSystemId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {activeDataSources.map((source) => (
                    <SelectItem key={source.id} value={source.id.toString()}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="attribute">Attribute *</Label>
              <Select
                value={formData.attributeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, attributeId: value })
                }
                disabled={!formData.dataSourceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent>
                  {attributes?.map((attribute) => (
                    <SelectItem key={attribute.id} value={attribute.id.toString()}>
                      {attribute.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="operator">Operator *</Label>
              <Select
                value={formData.operator}
                onValueChange={(value) =>
                  setFormData({ ...formData, operator: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value">Value *</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Enter filter value"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCondition ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCondition} onOpenChange={() => setDeletingCondition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter Condition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the filter condition "{deletingCondition?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
