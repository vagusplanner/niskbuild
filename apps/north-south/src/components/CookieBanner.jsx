import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      style={{ backgroundColor: "#373935", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="font-inter text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          We use cookies to improve your experience. By continuing, you agree to our{" "}
          <a href="/legal" className="underline" style={{ color: "#967462" }}>Privacy Policy</a>.
        </p>
        <div className="flex gap-3 shrink-0">
          <Button size="sm" variant="ghost" onClick={decline}
            className="rounded-full font-inter text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            Decline
          </Button>
          <Button size="sm" onClick={accept}
            className="rounded-full font-inter text-sm"
            style={{ backgroundColor: "#705546", color: "#f5f0eb" }}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}