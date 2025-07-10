
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterCondition, DataSystem, DataSource, DataSourceAttribute } from "@shared/schema";

interface FilterConditionWithDetails extends FilterCondition {
  dataSystemName?: string;
  dataSourceName?: string;
  attributeName?: string;
}

export default function FilterConditions() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFilterCondition, setEditingFilterCondition] = useState<FilterCondition | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    dataSystemId: "",
    dataSourceId: "",
    attributeId: "",
    operator: "",
    value: ""
  });

  const queryClient = useQueryClient();

  // Fetch filter conditions
  const { data: filterConditions = [], isLoading } = useQuery({
    queryKey: ["/api/filter-conditions"],
    queryFn: async () => {
      const response = await fetch("/api/filter-conditions", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch filter conditions");
      return response.json() as Promise<FilterCondition[]>;
    },
  });

  // Fetch data systems
  const { data: dataSystems = [] } = useQuery({
    queryKey: ["/api/data-systems"],
    queryFn: async () => {
      const response = await fetch("/api/data-systems", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch data systems");
      return response.json() as Promise<DataSystem[]>;
    },
  });

  // Fetch data sources for selected system
  const { data: dataSources = [] } = useQuery({
    queryKey: ["/api/data-sources", formData.dataSystemId],
    queryFn: async () => {
      if (!formData.dataSystemId) return [];
      const response = await fetch(`/api/data-systems/${formData.dataSystemId}/data-sources`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch data sources");
      return response.json() as Promise<DataSource[]>;
    },
    enabled: !!formData.dataSystemId,
  });

  // Fetch attributes for selected data source
  const { data: attributes = [] } = useQuery({
    queryKey: ["/api/data-source-attributes", formData.dataSourceId],
    queryFn: async () => {
      if (!formData.dataSourceId) return [];
      const response = await fetch(`/api/data-sources/${formData.dataSourceId}/attributes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch attributes");
      return response.json() as Promise<DataSourceAttribute[]>;
    },
    enabled: !!formData.dataSourceId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/filter-conditions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...data,
          dataSystemId: parseInt(data.dataSystemId),
          dataSourceId: parseInt(data.dataSourceId),
          attributeId: parseInt(data.attributeId),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create filter condition");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-conditions"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Filter condition created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/filter-conditions/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: data.name,
          dataSystemId: parseInt(data.dataSystemId),
          dataSourceId: parseInt(data.dataSourceId),
          attributeId: parseInt(data.attributeId),
          operator: data.operator,
          value: data.value,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update filter condition");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-conditions"] });
      setIsEditDialogOpen(false);
      setEditingFilterCondition(null);
      resetForm();
      toast({
        title: "Success",
        description: "Filter condition updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/filter-conditions/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete filter condition");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/filter-conditions"] });
      toast({
        title: "Success",
        description: "Filter condition deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      dataSystemId: "",
      dataSourceId: "",
      attributeId: "",
      operator: "",
      value: ""
    });
  };

  const handleCreate = () => {
    if (!formData.name || !formData.dataSystemId || !formData.dataSourceId || 
        !formData.attributeId || !formData.operator || !formData.value) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (filterCondition: FilterCondition) => {
    setEditingFilterCondition(filterCondition);
    setFormData({
      name: filterCondition.name,
      dataSystemId: filterCondition.dataSystemId.toString(),
      dataSourceId: filterCondition.dataSourceId.toString(),
      attributeId: filterCondition.attributeId.toString(),
      operator: filterCondition.operator,
      value: filterCondition.value
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name || !formData.dataSystemId || !formData.dataSourceId || 
        !formData.attributeId || !formData.operator || !formData.value) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ ...formData, id: editingFilterCondition?.id });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Get detailed filter conditions with names
  const filterConditionsWithDetails: FilterConditionWithDetails[] = filterConditions.map(fc => {
    const dataSystem = dataSystems.find(ds => ds.id === fc.dataSystemId);
    return {
      ...fc,
      dataSystemName: dataSystem?.name || "Unknown"
    };
  });

  const operators = [
    { value: "=", label: "= (equal to)" },
    { value: ">", label: "> (greater than)" },
    { value: "<", label: "< (less than)" }
  ];

  const FormFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter filter condition name"
        />
      </div>

      <div>
        <Label htmlFor="dataSystem">Data System</Label>
        <Select 
          value={formData.dataSystemId} 
          onValueChange={(value) => setFormData({ 
            ...formData, 
            dataSystemId: value,
            dataSourceId: "",
            attributeId: ""
          })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select data system" />
          </SelectTrigger>
          <SelectContent>
            {dataSystems
              .filter(ds => ds.isActive)
              .map((system) => (
                <SelectItem key={system.id} value={system.id.toString()}>
                  {system.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="dataSource">Data Source</Label>
        <Select 
          value={formData.dataSourceId} 
          onValueChange={(value) => setFormData({ 
            ...formData, 
            dataSourceId: value,
            attributeId: ""
          })}
          disabled={!formData.dataSystemId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select data source" />
          </SelectTrigger>
          <SelectContent>
            {dataSources
              .filter(ds => ds.activeFlag)
              .map((source) => (
                <SelectItem key={source.id} value={source.id.toString()}>
                  {source.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="attribute">Attribute</Label>
        <Select 
          value={formData.attributeId} 
          onValueChange={(value) => setFormData({ ...formData, attributeId: value })}
          disabled={!formData.dataSourceId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select attribute" />
          </SelectTrigger>
          <SelectContent>
            {attributes.map((attribute) => (
              <SelectItem key={attribute.id} value={attribute.id.toString()}>
                {attribute.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="operator">Operator</Label>
        <Select 
          value={formData.operator} 
          onValueChange={(value) => setFormData({ ...formData, operator: value })}
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
        <Label htmlFor="value">Value</Label>
        <Input
          id="value"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          placeholder="Enter filter value"
        />
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Filter Conditions</h1>
          <p className="text-muted-foreground">
            Manage filter conditions for data extraction
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Filter Condition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Filter Condition</DialogTitle>
              <DialogDescription>
                Create a new filter condition for data extraction
              </DialogDescription>
            </DialogHeader>
            <FormFields />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filter Conditions
          </CardTitle>
          <CardDescription>
            A list of all filter conditions in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Data System</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterConditionsWithDetails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No filter conditions found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filterConditionsWithDetails.map((filterCondition) => (
                  <TableRow key={filterCondition.id}>
                    <TableCell className="font-medium">{filterCondition.name}</TableCell>
                    <TableCell>{filterCondition.dataSystemName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{filterCondition.operator}</Badge>
                    </TableCell>
                    <TableCell>{filterCondition.value}</TableCell>
                    <TableCell>
                      {new Date(filterCondition.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(filterCondition)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Edit Filter Condition</DialogTitle>
                              <DialogDescription>
                                Update the filter condition details
                              </DialogDescription>
                            </DialogHeader>
                            <FormFields />
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? "Updating..." : "Update"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Filter Condition</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{filterCondition.name}"? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(filterCondition.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
