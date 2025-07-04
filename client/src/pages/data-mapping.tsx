
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Trash2, Edit, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DataSystem, DataSource, DataSourceAttribute, SrcmCanonical } from "@shared/schema";

interface DataMappingRow {
  id?: number;
  srcmCanonicalId: number;
  srcmCanonicalName: string;
  sourceDataSourceId?: number;
  sourceDataSourceName?: string;
  sourceAttributeId?: number;
  sourceAttributeName?: string;
  isEditing?: boolean;
}

export default function DataMapping() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDataSystemId, setSelectedDataSystemId] = useState<number>(0);
  const [mappingRows, setMappingRows] = useState<DataMappingRow[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);

  // Get all active data systems
  const { data: dataSystems } = useQuery<DataSystem[]>({
    queryKey: ["/api/data-systems"],
  });

  // Get SRCM canonical data
  const { data: srcmCanonicals } = useQuery<SrcmCanonical[]>({
    queryKey: ["/api/srcm-canonical"],
  });

  // Get data sources for selected system
  const { data: dataSources } = useQuery<DataSource[]>({
    queryKey: ["/api/data-systems", selectedDataSystemId, "data-sources"],
    queryFn: async () => {
      if (!selectedDataSystemId) return [];
      const response = await apiRequest("GET", `/api/data-systems/${selectedDataSystemId}/data-sources`);
      return response.json();
    },
    enabled: !!selectedDataSystemId,
  });

  // Get existing data mappings
  const { data: existingMappings } = useQuery({
    queryKey: ["/api/data-systems", selectedDataSystemId, "data-mappings"],
    queryFn: async () => {
      if (!selectedDataSystemId) return [];
      const response = await apiRequest("GET", `/api/data-systems/${selectedDataSystemId}/data-mappings`);
      return response.json();
    },
    enabled: !!selectedDataSystemId,
  });

  // Get attributes for a specific data source
  const getDataSourceAttributes = async (dataSourceId: number): Promise<DataSourceAttribute[]> => {
    if (!dataSourceId) return [];
    const response = await apiRequest("GET", `/api/data-sources/${dataSourceId}/attributes`);
    return response.json();
  };

  // Initialize mapping rows when data changes
  useEffect(() => {
    if (srcmCanonicals && selectedDataSystemId) {
      const rows: DataMappingRow[] = srcmCanonicals.map(srcm => {
        const existingMapping = existingMappings?.find(m => m.srcmCanonicalId === srcm.id);
        return {
          id: existingMapping?.id,
          srcmCanonicalId: srcm.id,
          srcmCanonicalName: srcm.name,
          sourceDataSourceId: existingMapping?.sourceDataSourceId,
          sourceDataSourceName: existingMapping?.sourceDataSourceName,
          sourceAttributeId: existingMapping?.sourceAttributeId,
          sourceAttributeName: existingMapping?.sourceAttributeName,
          isEditing: false,
        };
      });
      setMappingRows(rows);
    }
  }, [srcmCanonicals, existingMappings, selectedDataSystemId]);

  const createMappingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/data-mappings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems", selectedDataSystemId, "data-mappings"] });
      toast({
        title: "Success",
        description: "Data mapping saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/data-mappings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems", selectedDataSystemId, "data-mappings"] });
      toast({
        title: "Success",
        description: "Data mapping updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/data-mappings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-systems", selectedDataSystemId, "data-mappings"] });
      toast({
        title: "Success",
        description: "Data mapping deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleDataSystemChange = (value: string) => {
    setSelectedDataSystemId(parseInt(value));
    setEditingRow(null);
  };

  const handleEditRow = (index: number) => {
    setEditingRow(index);
    setMappingRows(prev => prev.map((row, i) => ({ ...row, isEditing: i === index })));
  };

  const handleCancelEdit = (index: number) => {
    setEditingRow(null);
    setMappingRows(prev => prev.map((row, i) => ({ ...row, isEditing: false })));
    // Reset to original values
    queryClient.invalidateQueries({ queryKey: ["/api/data-systems", selectedDataSystemId, "data-mappings"] });
  };

  const handleSaveRow = async (index: number) => {
    const row = mappingRows[index];
    
    const mappingData = {
      dataSystemId: selectedDataSystemId,
      srcmCanonicalId: row.srcmCanonicalId,
      sourceDataSourceId: row.sourceDataSourceId || null,
      sourceAttributeId: row.sourceAttributeId || null,
    };

    if (row.id) {
      // Update existing mapping
      await updateMappingMutation.mutateAsync({ id: row.id, data: mappingData });
    } else {
      // Create new mapping
      await createMappingMutation.mutateAsync(mappingData);
    }

    setEditingRow(null);
    setMappingRows(prev => prev.map((r, i) => ({ ...r, isEditing: false })));
  };

  const handleDeleteRow = async (index: number) => {
    const row = mappingRows[index];
    if (row.id) {
      await deleteMappingMutation.mutateAsync(row.id);
    }
  };

  const updateRowField = (index: number, field: string, value: any) => {
    setMappingRows(prev => prev.map((row, i) => {
      if (i === index) {
        const updatedRow = { ...row, [field]: value };
        
        // If changing data source, reset attribute
        if (field === 'sourceDataSourceId') {
          updatedRow.sourceAttributeId = undefined;
          updatedRow.sourceAttributeName = undefined;
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const activeDataSources = dataSources?.filter(ds => ds.activeFlag) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Mapping</h1>
          <p className="text-muted-foreground">
            Map SRCM canonical attributes to data source attributes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Data System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataSystem">Data System *</Label>
            <Select value={selectedDataSystemId.toString()} onValueChange={handleDataSystemChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a data system" />
              </SelectTrigger>
              <SelectContent>
                {dataSystems?.filter(system => system.isActive).map((system: DataSystem) => (
                  <SelectItem key={system.id} value={system.id.toString()}>
                    {system.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedDataSystemId > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Mapping Table</CardTitle>
            <p className="text-sm text-muted-foreground">
              Map SRCM canonical attributes to data source attributes for the selected system
            </p>
          </CardHeader>
          <CardContent>
            {mappingRows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No SRCM canonical attributes found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SRCM Attribute</TableHead>
                    <TableHead>Source Data Source</TableHead>
                    <TableHead>Source Attribute</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappingRows.map((row, index) => (
                    <MappingTableRow
                      key={row.srcmCanonicalId}
                      row={row}
                      index={index}
                      activeDataSources={activeDataSources}
                      editingRow={editingRow}
                      onEdit={() => handleEditRow(index)}
                      onSave={() => handleSaveRow(index)}
                      onCancel={() => handleCancelEdit(index)}
                      onDelete={() => handleDeleteRow(index)}
                      onUpdateField={updateRowField}
                      getDataSourceAttributes={getDataSourceAttributes}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MappingTableRowProps {
  row: DataMappingRow;
  index: number;
  activeDataSources: DataSource[];
  editingRow: number | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onUpdateField: (index: number, field: string, value: any) => void;
  getDataSourceAttributes: (dataSourceId: number) => Promise<DataSourceAttribute[]>;
}

function MappingTableRow({
  row,
  index,
  activeDataSources,
  editingRow,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onUpdateField,
  getDataSourceAttributes,
}: MappingTableRowProps) {
  const [attributes, setAttributes] = useState<DataSourceAttribute[]>([]);

  useEffect(() => {
    if (row.sourceDataSourceId) {
      getDataSourceAttributes(row.sourceDataSourceId).then(setAttributes);
    } else {
      setAttributes([]);
    }
  }, [row.sourceDataSourceId, getDataSourceAttributes]);

  const isEditing = editingRow === index;

  return (
    <TableRow>
      <TableCell className="font-medium">{row.srcmCanonicalName}</TableCell>
      
      <TableCell>
        {isEditing ? (
          <Select
            value={row.sourceDataSourceId?.toString() || ""}
            onValueChange={(value) => onUpdateField(index, 'sourceDataSourceId', value ? parseInt(value) : undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {activeDataSources.map((ds) => (
                <SelectItem key={ds.id} value={ds.id.toString()}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span>{row.sourceDataSourceName || "-"}</span>
        )}
      </TableCell>
      
      <TableCell>
        {isEditing ? (
          <Select
            value={row.sourceAttributeId?.toString() || ""}
            onValueChange={(value) => onUpdateField(index, 'sourceAttributeId', value ? parseInt(value) : undefined)}
            disabled={!row.sourceDataSourceId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select attribute" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {attributes.map((attr) => (
                <SelectItem key={attr.id} value={attr.id.toString()}>
                  {attr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span>{row.sourceAttributeName || "-"}</span>
        )}
      </TableCell>
      
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={onSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              {row.id && (
                <Button variant="outline" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
