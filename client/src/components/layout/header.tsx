import { Search, Bell, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";


export function Header() {
  const { user, logout } = useAuth();
  

  const getUserInitials = () => {
    if (!user) return "UN";
    return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Roads Inc.</h1>
          <p className="text-gray-600 mt-1">Healthcare Data Extraction Agent</p>
        </div>

        <div className="flex items-center space-x-4">
          
          {/* User Profile */}
          <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{getUserInitials()}</span>
            </div>
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
      </div>
    </header>
  );
}
