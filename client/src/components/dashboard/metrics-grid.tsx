import { Card, CardContent } from "@/components/ui/card";
import { Database, Settings, TrendingUp, CheckCircle, ArrowUp, Clock, ThumbsUp } from "lucide-react";

export function MetricsGrid() {
  const metrics = [
    {
      title: "Total Extractions",
      value: "1,247",
      change: "+12%",
      changeType: "positive",
      icon: Database,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      title: "Active Configurations",
      value: "23",
      change: "All operational",
      changeType: "neutral",
      icon: Settings,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
    },
    {
      title: "Data Processed",
      value: "2.3TB",
      change: "Last 30 days",
      changeType: "neutral",
      icon: TrendingUp,
      iconColor: "text-yellow-600",
      iconBg: "bg-yellow-100",
    },
    {
      title: "Success Rate",
      value: "98.7%",
      change: "Excellent performance",
      changeType: "positive",
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
    },
  ];

  const getChangeIcon = (type: string) => {
    switch (type) {
      case "positive":
        return <ArrowUp className="h-4 w-4" />;
      case "neutral":
        return <Clock className="h-4 w-4" />;
      default:
        return <ThumbsUp className="h-4 w-4" />;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case "positive":
        return "text-green-600";
      case "neutral":
        return "text-yellow-600";
      default:
        return "text-green-600";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{metric.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                <p className={`text-sm mt-2 flex items-center ${getChangeColor(metric.changeType)}`}>
                  {getChangeIcon(metric.changeType)}
                  <span className="ml-1">{metric.change}</span>
                </p>
              </div>
              <div className={`${metric.iconBg} rounded-lg p-3`}>
                <metric.icon className={`${metric.iconColor} h-6 w-6`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
