import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Shield, ShieldCheck, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateUserModal } from "@/components/user-management/create-user-modal";
import { ChangeUserPasswordModal } from "@/components/user-management/change-user-password-modal";
import type { User } from "@shared/schema";

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      return apiRequest("PUT", `/api/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User status updated",
        description: "User status has been successfully changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setPasswordModalOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    toggleStatusMutation.mutate({
      userId: user.id,
      isActive: !user.isActive,
    });
  };

  const getUserInitials = (user: User) => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Users
          </CardTitle>
          <CardDescription>
            Total users: {users?.length || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user: User) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.firstName} {user.lastName}</h3>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    {user.organization && (
                      <p className="text-sm text-gray-500">{user.organization}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangePassword(user)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Change Password
                  </Button>
                  <Button
                    variant={user.isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(user)}
                    className="flex items-center gap-1"
                    disabled={toggleStatusMutation.isPending}
                  >
                    {user.isActive ? (
                      <>
                        <Trash2 className="h-3 w-3" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3 w-3" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
            {!users?.length && (
              <div className="text-center py-8 text-gray-500">
                No users found. Create your first user to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {selectedUser && (
        <ChangeUserPasswordModal
          isOpen={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
        />
      )}
    </div>
  );
}