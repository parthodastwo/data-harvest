import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentExtractions } from "@/components/dashboard/recent-extractions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ExtractionConfigPanel } from "@/components/dashboard/extraction-config-panel";

export default function Dashboard() {
  return (
    <div className="p-6">
      <MetricsGrid />
      <QuickActions />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <RecentExtractions />
        <ActivityFeed />
      </div>

      <ExtractionConfigPanel />
    </div>
  );
}
