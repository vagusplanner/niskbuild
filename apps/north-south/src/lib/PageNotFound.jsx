import { Link } from 'react-router-dom';
import { Home, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const GOLD = "#B8952A";
const OLIVE = "#3D4A2F";
const CREAM = "#F5F0E0";
const FOREST = "#2C3B2D";

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-10"
      style={{ backgroundColor: OLIVE }}>

      <img
        src="https://media.base44.com/images/public/69dbb919df7f322227ac67eb/afb515277_NSC-logo-v5.png"
        alt="NSC" className="h-12 w-auto object-contain opacity-80"
      />

      <div className="space-y-3">
        <p className="font-cormorant text-8xl font-light" style={{ color: GOLD + "40" }}>404</p>
        <h1 className="font-cormorant text-4xl font-light text-white">Page not found</h1>
        <p className="font-inter text-sm max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/">
          <Button className="rounded-full px-8 font-inter gap-2"
            style={{ backgroundColor: GOLD, color: CREAM }}>
            <Home className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
        <Link to="/discovery">
          <Button variant="ghost" className="rounded-full px-8 font-inter border gap-2"
            style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)" }}>
            Free Discovery Call <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <p className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
        © {new Date().getFullYear()} North South Consulting
      </p>
    </div>
  );
}