import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { updateUserPasswordSchema, type UpdateUserPasswordRequest, type User } from "@shared/schema";

interface ChangeUserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export function ChangeUserPasswordModal({ isOpen, onClose, user }: ChangeUserPasswordModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UpdateUserPasswordRequest>({
    resolver: zodResolver(updateUserPasswordSchema),
    defaultValues: {
      userId: user.id,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: UpdateUserPasswordRequest) => {
      return apiRequest("PUT", `/api/users/${data.userId}/password`, {
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: `Password for ${user.firstName} ${user.lastName} has been successfully changed.`,
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateUserPasswordRequest) => {
    changePasswordMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const getUserInitials = () => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change User Password
            </DialogTitle>
            <DialogDescription>
              Update the password for this user account.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Avatar>
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-gray-600">@{user.username}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter new password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirm new password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={changePasswordMutation.isPending}
                className="min-w-[120px]"
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}