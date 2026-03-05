import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Check, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUpdatePost, useDeletePost } from "@/hooks/useGetLatePosts";
import { GetLatePost } from "@/lib/api/getlate";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { platformConfig } from "./CalendarCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PostEditPanelProps {
  post: GetLatePost | null;
  onClose: () => void;
}

export function PostEditPanel({ post, onClose }: PostEditPanelProps) {
  const [text, setText] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  useEffect(() => {
    if (post) {
      setText(post.text || "");
      setScheduledFor(
        post.scheduledFor
          ? format(new Date(post.scheduledFor), "yyyy-MM-dd'T'HH:mm")
          : ""
      );
    }
  }, [post]);

  const handleSave = () => {
    if (!post) return;
    updatePost.mutate(
      {
        postId: post.id,
        text: text !== post.text ? text : undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      },
      { onSuccess: onClose }
    );
  };

  const handleDelete = () => {
    if (!post) return;
    deletePost.mutate(post.id, { onSuccess: onClose });
  };

  const platform = post?.platformResults?.[0]?.platform || "twitter";
  const pConfig = platformConfig[platform] || platformConfig.twitter;
  const PlatformIcon = pConfig.icon;

  return (
    <AnimatePresence>
      {post && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[380px] flex-col border-l bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <PlatformIcon className={cn("h-4 w-4", pConfig.color)} />
                <h3 className="font-semibold">Edit Post</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Label>Status</Label>
                  <Badge
                    variant={
                      post.status === "published" ? "default" :
                      post.status === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {post.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="post-text">Caption</Label>
                <Textarea
                  id="post-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  className="mt-1.5 resize-none"
                  placeholder="Write your post..."
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {text.length} characters
                </p>
              </div>

              <div>
                <Label htmlFor="post-schedule">
                  <CalendarIcon className="mr-1 inline h-3.5 w-3.5" />
                  Schedule
                </Label>
                <Input
                  id="post-schedule"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              {post.platformResults && post.platformResults.length > 0 && (
                <div>
                  <Label>Platforms</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {post.platformResults.map((pr) => {
                      const pc = platformConfig[pr.platform];
                      const Icon = pc?.icon;
                      return (
                        <Badge key={pr.accountId} variant="outline" className="gap-1">
                          {Icon && <Icon className={cn("h-3 w-3", pc?.color)} />}
                          {pr.platform}
                          {pr.status === "failed" && (
                            <span className="text-red-500">failed</span>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t px-4 py-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this post. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={handleSave} disabled={updatePost.isPending} size="sm">
                {updatePost.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
