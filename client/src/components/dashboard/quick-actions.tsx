import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, FileText } from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "New Data Extraction",
      icon: Plus,
      color: "bg-blue-600 hover:bg-blue-700",
      action: () => console.log("Start new extraction"),
    },
    {
      title: "Create Configuration",
      icon: Settings,
      color: "bg-green-600 hover:bg-green-700",
      action: () => console.log("Create configuration"),
    },
    {
      title: "Generate Report",
      icon: FileText,
      color: "bg-yellow-500 hover:bg-yellow-600 text-gray-900",
      action: () => console.log("Generate report"),
    },
  ];

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              className={`flex items-center justify-center px-6 py-4 ${action.color} text-white transition-colors h-auto`}
            >
              <action.icon className="h-5 w-5 mr-3" />
              {action.title}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
