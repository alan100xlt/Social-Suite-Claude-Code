import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Palette, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function ProfileTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      toast({ title: "Password Required", description: "Please enter a new password.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please make sure your passwords match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password Updated", description: "Your password has been successfully changed." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({ title: "Update Failed", description: error instanceof Error ? error.message : "Failed to update password", variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /><CardTitle>Profile</CardTitle></div>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" placeholder="Enter your name" /></div>
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" defaultValue={user?.email || ""} disabled /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="company">Company</Label><Input id="company" placeholder="Your company (optional)" /></div>
          <Button className="gradient-accent">Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /><CardTitle>Security</CardTitle></div>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="new-password">New Password</Label><Input id="new-password" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="confirm-password">Confirm Password</Label><Input id="confirm-password" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
          </div>
          <Button variant="outline" onClick={handleUpdatePassword} disabled={isUpdatingPassword}>
            {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /><CardTitle>Appearance</CardTitle></div>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-foreground">Compact Mode</p><p className="text-sm text-muted-foreground">Use a more condensed layout</p></div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
