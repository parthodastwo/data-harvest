import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentExtractions } from "@/components/dashboard/recent-extractions";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ExtractionConfigPanel } from "@/components/dashboard/extraction-config-panel";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header />
        <div className="p-6">
          <MetricsGrid />
          <QuickActions />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <RecentExtractions />
            <ActivityFeed />
          </div>

          <ExtractionConfigPanel />
        </div>
      </main>
    </div>
  );
}
