import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function RecentExtractions() {
  const extractions = [
    {
      name: "Patient Case Analysis Q4",
      status: "completed",
      date: "Dec 15, 2024",
      statusColor: "bg-green-100 text-green-800",
    },
    {
      name: "Emergency Dept. Metrics",
      status: "processing",
      date: "Dec 14, 2024",
      statusColor: "bg-yellow-100 text-yellow-800",
    },
    {
      name: "Readmission Analysis",
      status: "scheduled",
      date: "Dec 16, 2024",
      statusColor: "bg-blue-100 text-blue-800",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Extractions</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {extractions.map((extraction, index) => (
            <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  extraction.status === 'completed' ? 'bg-green-500' :
                  extraction.status === 'processing' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{extraction.name}</p>
                  <p className="text-xs text-gray-500">{extraction.date}</p>
                </div>
              </div>
              <Badge className={extraction.statusColor} variant="secondary">
                {extraction.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
