import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import FooterSection from "../components/landing/FooterSection";
import { ArrowRight, Clock } from "lucide-react";

const posts = [
  {
    title: "Executive Presence: What It Really Means (And How To Build It)",
    excerpt: "Beyond suits and firm handshakes — true executive presence is about the energy you carry into a room, the clarity of your thinking and the authority with which you speak. Here's how to develop it intentionally.",
    category: "Executive Presence",
    readTime: "6 min",
    date: "April 2026",
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/16b785c57_Gemini_Generated_Image_z4qu7rz4qu7rz4qu.png",
    featured: true,
  },
  {
    title: "How Non-Native English Speakers Can Command Any Room",
    excerpt: "Your accent is not your weakness — it's your signature. The world's most compelling communicators are not those who sound the most 'native' but those who speak with the most intention and authenticity.",
    category: "Language & Communication",
    readTime: "5 min",
    date: "March 2026",
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/1dd5ec035_WhatsAppImage2026-04-26at005822.jpg",
  },
  {
    title: "Body Language in Virtual Meetings: 7 Things You're Getting Wrong",
    excerpt: "The camera has changed the rules of non-verbal communication. From eye contact to framing, here are the seven most common body language mistakes leaders make on video calls — and exactly how to fix them.",
    category: "Body Language",
    readTime: "7 min",
    date: "March 2026",
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/6a856b379_WhatsAppImage2026-04-26at0133121.jpg",
  },
  {
    title: "5 Cross-Cultural Communication Mistakes That Cost Leaders Deals",
    excerpt: "After 20 years of advising international executives across 30+ countries, these are the five communication mistakes I see most often — and the ones that cost the most in trust, relationships and revenue.",
    category: "Cross-Cultural",
    readTime: "8 min",
    date: "February 2026",
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/b05726640_Gemini_Generated_Image_xlyc38xlyc38xlyc.png",
  },
  {
    title: "How To Prepare For a Media Interview: A Broadcast Professional's Guide",
    excerpt: "Having worked with BBC, National Geographic, ITV and Al Jazeera, I've seen hundreds of executives sit in front of a camera. The ones who perform best share one thing — preparation, not confidence.",
    category: "Media Training",
    readTime: "9 min",
    date: "February 2026",
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/3f58a0b78_IMG_27452.png",
  },
  {
    title: "The Art of the Executive Email: Write With Authority and Brevity",
    excerpt: "The average senior executive sends 40+ emails a day. Most are overwritten, understructured and fail to move people to action. Here's how to write emails that command attention and get results.",
    category: "Written Communication",
    readTime: "5 min",
    date: "January 2026",
    image: "https://media.base44.com/images/public/69dbb919df7f322227ac67eb/f99f8a34c_Gemini_Generated_Image_qpwd4aqpwd4aqpwd.png",
  },
];

const categories = ["All", "Executive Presence", "Language & Communication", "Body Language", "Cross-Cultural", "Media Training", "Written Communication"];

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered = activeCategory === "All" ? posts : posts.filter(p => p.category === activeCategory);
  const featured = posts.find(p => p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-28">

        <div className="text-center mb-16 space-y-4">
          <p className="font-inter text-xs tracking-widest uppercase font-medium text-primary">Insights & Perspectives</p>
          <h1 className="font-cormorant text-5xl md:text-6xl font-light text-foreground leading-tight">
            Communication Intelligence<br /><em>from the field</em>
          </h1>
          <p className="font-inter text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Practical insights from 20 years of coaching executives, producing media and advising international organisations.
          </p>
        </div>

        {/* Featured */}
        {featured && activeCategory === "All" && (
          <div className="rounded-3xl overflow-hidden border border-border mb-12 grid md:grid-cols-2 group cursor-pointer hover:shadow-xl transition-shadow">
            <div className="relative h-64 md:h-auto overflow-hidden">
              <img src={featured.image} alt={featured.title}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="p-8 md:p-12 flex flex-col justify-center space-y-4" style={{ backgroundColor: "#373935" }}>
              <div className="flex items-center gap-3">
                <span className="font-inter text-xs px-3 py-1 rounded-full" style={{ backgroundColor: "#705546", color: "white" }}>Featured</span>
                <span className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{featured.category}</span>
              </div>
              <h2 className="font-cormorant text-3xl font-light text-white leading-tight">{featured.title}</h2>
              <p className="font-inter text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{featured.excerpt.replace("clarity of your thinking,", "clarity of your thinking")}</p>
              <div className="flex items-center gap-4">
                <span className="font-inter text-xs flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <Clock className="w-3 h-3" /> {featured.readTime} read
                </span>
                <span className="font-inter text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{featured.date}</span>
              </div>
              <div className="flex items-center gap-2 font-inter text-sm font-medium" style={{ color: "#967462" }}>
                Read article <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)}
              className="font-inter text-xs px-4 py-2 rounded-full transition-all"
              style={activeCategory === c
                ? { backgroundColor: "#705546", color: "white" }
                : { backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))" }}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.filter(p => !(p.featured && activeCategory === "All")).map((post, i) => (
            <article key={i} className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all cursor-pointer">
              <div className="relative h-52 overflow-hidden">
                <img src={post.image} alt={post.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-inter text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: "#705546" + "15", color: "#705546" }}>
                    {post.category}
                  </span>
                  <span className="font-inter text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {post.readTime}
                  </span>
                </div>
                <h3 className="font-cormorant text-xl font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="font-inter text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-inter text-xs text-muted-foreground">{post.date}</span>
                  <span className="font-inter text-xs font-medium text-primary flex items-center gap-1">
                    Read <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-3xl p-10 text-center space-y-4" style={{ backgroundColor: "#705546" }}>
          <h3 className="font-cormorant text-3xl font-light text-white">Turn insight into action.</h3>
          <p className="font-inter text-sm text-white/70 max-w-md mx-auto">Book a free discovery call and take the first step towards extraordinary communication.</p>
          <Link to="/discovery">
            <button className="font-inter text-sm px-8 py-3 rounded-full mt-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#373935", color: "white" }}>
              Free Discovery Call
            </button>
          </Link>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}