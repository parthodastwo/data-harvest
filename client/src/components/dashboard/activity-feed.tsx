import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, User, AlertTriangle } from "lucide-react";

export function ActivityFeed() {
  const activities = [
    {
      title: "Patient Data Export",
      description: "completed successfully",
      time: "2 minutes ago",
      icon: CheckCircle,
      iconColor: "bg-green-500",
    },
    {
      title: "Dr. Sarah Wilson",
      description: "created new configuration",
      time: "1 hour ago",
      icon: User,
      iconColor: "bg-blue-500",
    },
    {
      title: "System maintenance scheduled",
      description: "for Sunday 2 AM",
      time: "3 hours ago",
      icon: AlertTriangle,
      iconColor: "bg-yellow-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={index} className="flex space-x-3">
              <div className={`w-8 h-8 ${activity.iconColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                <activity.icon className="text-white h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.title}</span> {activity.description}
                </p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
