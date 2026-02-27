import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformSettings, useUpdatePlatformSettings } from "@/hooks/usePlatformSettings";
import { Globe, Palette, Mail, Image, Save } from "lucide-react";

export default function PlatformSettingsPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();

  const [form, setForm] = useState({
    platform_name: "",
    platform_logo_url: "",
    platform_favicon_url: "",
    platform_domain: "",
    support_email: "",
    primary_color: "#667eea",
    secondary_color: "#764ba2",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        platform_name: settings.platform_name || "",
        platform_logo_url: settings.platform_logo_url || "",
        platform_favicon_url: settings.platform_favicon_url || "",
        platform_domain: settings.platform_domain || "",
        support_email: settings.support_email || "",
        primary_color: settings.primary_color || "#667eea",
        secondary_color: settings.secondary_color || "#764ba2",
      });
    }
  }, [settings]);

  const handleSave = () => {
    if (!settings?.id) return;
    updateMutation.mutate({
      id: settings.id,
      platform_name: form.platform_name,
      platform_logo_url: form.platform_logo_url || null,
      platform_favicon_url: form.platform_favicon_url || null,
      platform_domain: form.platform_domain || null,
      support_email: form.support_email || null,
      primary_color: form.primary_color || null,
      secondary_color: form.secondary_color || null,
    });
  };

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global platform identity and branding</p>
        </div>

        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Identity
            </CardTitle>
            <CardDescription>Platform name, domain, and contact info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform_name">Platform Name</Label>
              <Input
                id="platform_name"
                value={form.platform_name}
                onChange={(e) => update("platform_name", e.target.value)}
                placeholder="Longtale.ai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform_domain">Platform Domain</Label>
              <Input
                id="platform_domain"
                value={form.platform_domain}
                onChange={(e) => update("platform_domain", e.target.value)}
                placeholder="social.longtale.ai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                value={form.support_email}
                onChange={(e) => update("support_email", e.target.value)}
                placeholder="support@longtale.ai"
              />
              <p className="text-xs text-muted-foreground">Shown in emails and support links</p>
            </div>
          </CardContent>
        </Card>

        {/* Logos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Logos
            </CardTitle>
            <CardDescription>URLs for the platform logo and favicon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform_logo_url">Logo URL</Label>
              <Input
                id="platform_logo_url"
                value={form.platform_logo_url}
                onChange={(e) => update("platform_logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {form.platform_logo_url && (
                <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50 flex items-center justify-center">
                  <img
                    src={form.platform_logo_url}
                    alt="Platform logo preview"
                    className="max-h-16 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform_favicon_url">Favicon URL</Label>
              <Input
                id="platform_favicon_url"
                value={form.platform_favicon_url}
                onChange={(e) => update("platform_favicon_url", e.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
              {form.platform_favicon_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={form.platform_favicon_url}
                    alt="Favicon preview"
                    className="h-6 w-6 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="text-xs text-muted-foreground">Favicon preview</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Brand Colors
            </CardTitle>
            <CardDescription>Used in emails and external-facing pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary_color"
                    value={form.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    className="h-10 w-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondary_color"
                    value={form.secondary_color}
                    onChange={(e) => update("secondary_color", e.target.value)}
                    className="h-10 w-10 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={form.secondary_color}
                    onChange={(e) => update("secondary_color", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div
              className="h-12 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
              }}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
