import { useEffect, useRef } from "react";
import { CourierInbox, useCourier } from "@trycourier/courier-react";
import { useCourierToken } from "@/contexts/CourierContext";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function InboxContent() {
  const courier = useCourier();
  const { courierToken } = useCourierToken();
  const { user } = useAuth();
  const hasSignedIn = useRef(false);

  useEffect(() => {
    if (courierToken && user && courier && !hasSignedIn.current) {
      hasSignedIn.current = true;
      courier.auth.signIn({
        userId: user.id,
        jwt: courierToken,
      });
    }
  }, [courierToken, user, courier]);

  return (
    <div className="min-h-[200px]">
      <CourierInbox
        height="400px"
        mode="system"
      />
    </div>
  );
}

export function NotificationInbox() {
  const { courierToken, isLoading } = useCourierToken();
  const courier = useCourier();
  const unreadCount = courier?.inbox?.totalUnreadCount ?? 0;

  if (isLoading || !courierToken) {
    return (
      <Button variant="ghost" size="icon" className="relative" disabled={isLoading}>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0 max-h-[500px] overflow-hidden">
        <InboxContent />
      </PopoverContent>
    </Popover>
  );
}
