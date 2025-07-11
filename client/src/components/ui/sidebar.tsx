import { useState } from "react";
import {
  Heart,
  LayoutDashboard,
  HardDrive,
  Database,
  GitBranch,
  Download,
  Settings,
  Users,
  Menu,
  LogOut,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { PasswordChangeModal } from "@/components/auth/password-change-modal";

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: HardDrive, label: "Data Systems", path: "/data-systems" },
    { icon: Database, label: "Data Sources", path: "/data-sources" },
    { icon: GitBranch, label: "Cross References", path: "/cross-references" },
    { icon: Shuffle, label: "Data Mapping", path: "/data-mapping" },
    { icon: Download, label: "Data Extraction", path: "/data-extraction" },
    { icon: Settings, label: "Filter Conditions", path: "/filter-conditions" },
    { icon: Users, label: "User Management", path: "/users", adminOnly: true },
  ];

  const getUserInitials = () => {
    if (!user) return "UN";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <>
      <aside
        className={`bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"}`}
      >
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center ${isCollapsed ? "justify-center" : ""}`}
            >
              <div className="bg-blue-600 rounded-lg w-10 h-10 flex items-center justify-center">
                <Heart className="text-white h-6 w-6" />
              </div>
              {!isCollapsed && (
                <div className="ml-3">
                  <h4 className="font-bold text-lg text-gray-900">
                    Data Harvest
                  </h4>
                  <p className="text-xs text-gray-600">
                    Data Extraction Platform
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems
              .filter((item) => !item.adminOnly || user?.role === "admin")
              .map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => setLocation(item.path)}
                    className={`flex items-center w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      location === item.path
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${!isCollapsed ? "mr-3" : ""}`}
                    />
                    {!isCollapsed && item.label}
                  </button>
                </li>
              ))}
          </ul>
        </nav>
      </aside>

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
