import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, AlertCircle, Clock, ExternalLink } from "lucide-react";

type ApprovalStatus = "loading" | "pending" | "approving" | "approved" | "expired" | "already_processed" | "not_found" | "error";

export default function ApprovePost() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<ApprovalStatus>("loading");
  const [approval, setApproval] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) { setStatus("not_found"); return; }
    fetchApproval();
  }, [token]);

  const fetchApproval = async () => {
    const { data, error } = await supabase
      .from("post_approvals")
      .select("*")
      .eq("token", token!)
      .maybeSingle();

    if (error || !data) {
      setStatus("not_found");
      return;
    }

    if (data.status !== "pending") {
      setStatus("already_processed");
      setApproval(data);
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setStatus("expired");
      setApproval(data);
      return;
    }

    setApproval(data);
    setStatus("pending");
  };

  // Set og:image meta tag for social previews
  useEffect(() => {
    const imageUrl = approval?.image_url || approval?.article_image_url;
    if (!imageUrl) return;

    let meta = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', 'og:image');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', imageUrl);

    return () => { meta?.remove(); };
  }, [approval?.image_url, approval?.article_image_url]);

  const handleApprove = async () => {
    setStatus("approving");
    try {
      const { data, error } = await supabase.functions.invoke("approve-posts", {
        body: { token },
      });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      if (data?.error) {
        setErrorMsg(data.error);
        setStatus("error");
        return;
      }

      setStatus("approved");
    } catch (e) {
      setErrorMsg("An unexpected error occurred");
      setStatus("error");
    }
  };

  const platformContents = (approval?.platform_contents || {}) as Record<string, string>;
  const platforms = Object.keys(platformContents);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">GetLate</h1>
          <p className="text-muted-foreground mt-1">Post Approval</p>
        </div>

        {status === "loading" && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {status === "not_found" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Not Found</h2>
              <p className="text-muted-foreground mt-2">This approval link is invalid or has been removed.</p>
            </CardContent>
          </Card>
        )}

        {status === "expired" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-12 h-12 text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Link Expired</h2>
              <p className="text-muted-foreground mt-2">This approval link has expired. Please request a new one.</p>
            </CardContent>
          </Card>
        )}

        {status === "already_processed" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Check className="w-12 h-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Already {approval?.status === "approved" ? "Approved" : "Processed"}</h2>
              <p className="text-muted-foreground mt-2">These posts have already been {approval?.status}.</p>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold text-foreground">Something Went Wrong</h2>
              <p className="text-muted-foreground mt-2">{errorMsg}</p>
              <Button className="mt-4" onClick={() => setStatus("pending")}>Try Again</Button>
            </CardContent>
          </Card>
        )}

        {status === "approved" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Posts Approved & Published! 🎉</h2>
              <p className="text-muted-foreground mt-2">All posts have been published to their respective platforms.</p>
            </CardContent>
          </Card>
        )}

        {(status === "pending" || status === "approving") && (
          <div className="space-y-4">
            {/* Article info */}
            {approval?.article_title && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Article</p>
                  <p className="font-medium text-foreground">{approval.article_title}</p>
                  {approval.article_link && (
                    <a href={approval.article_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      View article <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Posts */}
            <div className="space-y-3">
              {platforms.map((platform) => (
                <Card key={platform}>
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{platform}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{platformContents[platform]}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Image preview */}
            {(approval?.image_url || approval?.article_image_url) && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-2">Attached Image</p>
                  <img
                    src={approval.image_url || approval.article_image_url}
                    alt="Post image"
                    className="rounded-lg max-h-48 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Approve button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                onClick={handleApprove}
                disabled={status === "approving"}
                className="gap-2 px-8"
              >
                {status === "approving" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve & Publish All Posts
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
