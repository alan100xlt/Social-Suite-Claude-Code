import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export function NotificationsTab() {
  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /><CardTitle>Notifications</CardTitle></div>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-foreground">Email Notifications</p><p className="text-sm text-muted-foreground">Receive email updates about your posts</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-foreground">Post Published</p><p className="text-sm text-muted-foreground">Get notified when your scheduled posts go live</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-foreground">Weekly Analytics</p><p className="text-sm text-muted-foreground">Receive weekly performance reports</p></div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
