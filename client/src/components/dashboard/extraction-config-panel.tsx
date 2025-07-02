import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Play } from "lucide-react";

export function ExtractionConfigPanel() {
  const [config, setConfig] = useState({
    dataSource: "",
    dateFrom: "",
    patientCriteria: "",
    format: "",
    includePhí: false,
    anonymize: true,
  });

  const handleSaveConfiguration = () => {
    console.log("Saving configuration:", config);
  };

  const handleRunExtraction = () => {
    console.log("Running extraction with config:", config);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Data Configuration</CardTitle>
        <p className="text-gray-600 text-sm">Configure and run data extractions with custom parameters</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <Label htmlFor="dataSource">Data Source</Label>
            <Select value={config.dataSource} onValueChange={(value) => setConfig(prev => ({ ...prev, dataSource: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ehr">Electronic Health Records</SelectItem>
                <SelectItem value="claims">Claims Database</SelectItem>
                <SelectItem value="registry">Patient Registry</SelectItem>
                <SelectItem value="lab">Laboratory Systems</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dateFrom">Date Range</Label>
            <Input
              type="date"
              id="dateFrom"
              value={config.dateFrom}
              onChange={(e) => setConfig(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="patientCriteria">Patient Criteria</Label>
            <Select value={config.patientCriteria} onValueChange={(value) => setConfig(prev => ({ ...prev, patientCriteria: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select criteria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="emergency">Emergency Admissions</SelectItem>
                <SelectItem value="chronic">Chronic Conditions</SelectItem>
                <SelectItem value="surgical">Surgical Cases</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="format">Export Format</Label>
            <Select value={config.format} onValueChange={(value) => setConfig(prev => ({ ...prev, format: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includePhí"
                checked={config.includePhí}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includePhí: checked as boolean }))}
              />
              <Label htmlFor="includePhí" className="text-sm">
                Include PHI (Protected Health Information)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymize"
                checked={config.anonymize}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, anonymize: checked as boolean }))}
              />
              <Label htmlFor="anonymize" className="text-sm">
                Anonymize data
              </Label>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleSaveConfiguration}>
              Save Configuration
            </Button>
            <Button onClick={handleRunExtraction} className="bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4 mr-2" />
              Run Extraction
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
