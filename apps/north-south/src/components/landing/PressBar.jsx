const GOLD = "#B8952A";
const FOREST = "#2C3B2D";

const mediaLogos = [
  { name: "BBC", style: "font-bold text-lg tracking-tight" },
  { name: "Al Jazeera", style: "font-medium text-base italic" },
  { name: "ITV", style: "font-bold text-lg tracking-widest" },
  { name: "National Geographic", style: "font-medium text-sm tracking-wide uppercase" },
  { name: "Channel 4", style: "font-bold text-base" },
  { name: "Channel 5", style: "font-bold text-base" },
  { name: "HSBC", style: "font-bold text-lg tracking-widest" },
  { name: "Canon", style: "font-medium text-lg tracking-tight" },
  { name: "Stellantis", style: "font-medium text-base uppercase tracking-widest" },
  { name: "Kellogg's", style: "font-medium text-lg italic" },
  { name: "Qatar Media Corp", style: "font-medium text-sm uppercase tracking-wide" },
];

export default function PressBar() {
  return (
    <section className="py-12 border-y" style={{ borderColor: GOLD + "25", backgroundColor: "#F5F0E0" }}>
      <div className="max-w-7xl mx-auto px-6">
        <p className="font-inter text-xs tracking-widest uppercase text-center font-medium mb-6"
          style={{ color: GOLD + "99" }}>
          Clients &amp; Partners
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {mediaLogos.map(logo => (
            <span key={logo.name}
              className={`font-cormorant transition-opacity hover:opacity-100 cursor-default select-none ${logo.style}`}
              style={{ color: FOREST + "40", fontSize: logo.name.length > 10 ? "0.8rem" : "1rem" }}>
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}