/**
 * AuthGuard — wrap any page that requires login.
 * If the user is not authenticated, shows a branded gate with a sign-in button.
 */
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";

export default function AuthGuard({ children }) {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, navigateToLogin } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: OLIVE }}>
        <div className="w-8 h-8 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8"
        style={{ backgroundColor: OLIVE }}>
        <img
          src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/afb515277_NSC-logo-v5.png"
          alt="NSC" className="h-12 w-auto object-contain"
        />
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: GOLD + "25" }}>
            <Lock className="w-6 h-6" style={{ color: GOLD }} />
          </div>
          <h2 className="font-cormorant text-3xl font-light text-white">Sign in required</h2>
          <p className="font-inter text-sm max-w-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            This area is for North South Consulting members. Please sign in to continue.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={navigateToLogin} className="rounded-full px-8 font-inter"
            style={{ backgroundColor: GOLD, color: CREAM }}>
            Sign In / Register
          </Button>
          <Button variant="ghost" className="rounded-full px-8 font-inter border"
            style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)" }}
            onClick={() => window.location.href = "/"}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return children;
}