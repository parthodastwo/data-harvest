import { useState } from "react";
import { Heart, BarChart3, Database, Settings, History, Users, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { PasswordChangeModal } from "@/components/auth/password-change-modal";

export function Sidebar() {
  const { user, logout } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: BarChart3, label: "Dashboard", active: true },
    { icon: Database, label: "Data Extractions" },
    { icon: Settings, label: "Configurations" },
    { icon: BarChart3, label: "Reports & Analytics" },
    { icon: History, label: "Extraction History" },
    { icon: Users, label: "User Management" },
  ];

  const getUserInitials = () => {
    if (!user) return "UN";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <>
      <aside className={`bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="bg-blue-600 rounded-lg w-10 h-10 flex items-center justify-center">
                <Heart className="text-white h-6 w-6" />
              </div>
              {!isCollapsed && (
                <div className="ml-3">
                  <h2 className="font-bold text-lg text-gray-900">Health Data Harvest</h2>
                  <p className="text-xs text-gray-600">Data Extraction Platform</p>
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
            {menuItems.map((item, index) => (
              <li key={index}>
                <button
                  className={`flex items-center w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    item.active
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <item.icon className={`h-5 w-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                  {!isCollapsed && item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getUserInitials()}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="p-1"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="p-1 text-red-600 hover:text-red-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{getUserInitials()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="p-1 text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
