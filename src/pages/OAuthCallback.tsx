import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Get OAuth callback parameters
    const tempToken = searchParams.get("tempToken");
    const connectToken = searchParams.get("connect_token");
    const pendingDataToken = searchParams.get("pendingDataToken");
    const error = searchParams.get("error");
    const platform = searchParams.get("platform");
    const userProfileParam = searchParams.get("userProfile");

    // Decode userProfile if present (GetLate sends it as URL-encoded JSON)
    let userProfile: { id?: string; name?: string; profilePicture?: string } | undefined;
    if (userProfileParam) {
      try {
        userProfile = JSON.parse(decodeURIComponent(userProfileParam));
      } catch (e) {
        console.error("Failed to parse userProfile:", e);
      }
    }

    if (error) {
      // Send error message to parent window
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-callback', error, platform }, window.location.origin);
        window.close();
      } else {
        navigate('/app/connections?error=' + encodeURIComponent(error));
      }
      return;
    }

    if (tempToken || connectToken || pendingDataToken) {
      // Success - send message to parent window with platform info
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth-callback',
          success: true,
          tempToken,
          connectToken,
          pendingDataToken,
          platform,
          userProfile,
        }, window.location.origin);
        window.close();
      } else {
        // If not in popup, redirect to connections with token info
        const params = new URLSearchParams();
        params.set('connected', 'true');
        if (tempToken) params.set('tempToken', tempToken);
        if (pendingDataToken) params.set('pendingDataToken', pendingDataToken);
        if (platform) params.set('platform', platform);
        if (userProfile) params.set('userProfile', JSON.stringify(userProfile));
        navigate('/app/connections?' + params.toString());
      }
    } else {
      // No tokens, redirect to connections
      navigate('/app/connections');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-foreground">Connecting your account...</h1>
        <p className="text-muted-foreground mt-2">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
}
