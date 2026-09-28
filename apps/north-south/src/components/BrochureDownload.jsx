import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

const FOREST = "#2C3B2D";
const GOLD   = "#B8952A";
const OLIVE  = "#3D4A2F";
const CREAM  = "#F5F0E0";
const BROWN  = "#705546";

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

async function loadImg(url) {
  try {
    const res  = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((ok, fail) => {
      const r = new FileReader();
      r.onloadend = () => ok(r.result);
      r.onerror   = fail;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

async function toGrey(url) {
  const b64 = await loadImg(url);
  if (!b64) return null;
  return new Promise(ok => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0,0,cv.width,cv.height);
      for (let i=0; i<d.data.length; i+=4) {
        const avg = 0.299*d.data[i] + 0.587*d.data[i+1] + 0.114*d.data[i+2];
        d.data[i] = d.data[i+1] = d.data[i+2] = avg;
      }
      ctx.putImageData(d, 0, 0);
      ok(cv.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = () => ok(null);
    img.src = b64;
  });
}

// ── shared helpers ────────────────────────────────────────────────────────────
function hdr(doc, fr,fg,fb, gr,gg,gb) {
  doc.setFillColor(fr,fg,fb); doc.rect(0,0,210,17,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
  doc.setTextColor(gr,gg,gb); doc.text("NORTH SOUTH CONSULTING & COACHING",14,7.5);
  doc.setFont("helvetica","normal"); doc.setFontSize(5.5);
  doc.setTextColor(200,190,180);
  doc.text("www.nsconsultd.com  ·  contact@nsconsultd.com  ·  +33 6 50 76 96 45",14,13);
}
function ftr(doc, fr,fg,fb, gr,gg,gb, n) {
  doc.setFillColor(fr,fg,fb); doc.rect(0,282,210,15,"F");
  doc.setFont("helvetica","normal"); doc.setFontSize(6);
  doc.setTextColor(gr,gg,gb); doc.text("www.nsconsultd.com",14,290);
  doc.setTextColor(150,140,130); doc.text(String(n),200,290,{align:"right"});
}
function goldRule(doc, x,y,w, gr,gg,gb) {
  doc.setDrawColor(gr,gg,gb); doc.setLineWidth(0.4); doc.line(x,y,x+w,y);
}

// ── data ─────────────────────────────────────────────────────────────────────
const credentials = [
  "20+ years of experience",         "UK-based, globally active",
  "International & multilingual",    "Government advisory work",
  "Corporate film director",         "MA Communication — Coventry University",
];
const skills = [
  { num:"01", title:"Communication Excellence",   desc:"Verbal, written and interpersonal — across cultures, languages and industries." },
  { num:"02", title:"Global Negotiations",        desc:"Negotiated access with governments and key international political figures." },
  { num:"03", title:"Media & Strategy",           desc:"Advised on communicating with media, clients and social channels." },
  { num:"04", title:"Cross-Cultural Adaptability",desc:"Consulted on international cultural differences across 30+ countries." },
];
const clients = [
  "Canon","Stellantis","Kellogg's","Al Jazeera","BBC","National Geographic",
  "HSBC","ITV","Channel 4","Channel 5","Qatar Media Corporation","Gulf Drilling International",
];
const sectors = [
  "Media Organisations","International Automobile Brands",
  "Petroleum Companies","Banking & Finance",
  "Food Retailers","Government & Diplomatic Organisations",
];
const serviceCategories = [
  { heading:"Communication Mastery", color:OLIVE,
    desc:"The foundation of every great leader — how you speak, write, and present yourself to the world.",
    services:[
      {title:"Verbal Communication",      desc:"Command the room with precise articulation, persuasive delivery and executive tone. From boardroom to keynote."},
      {title:"Written Communication",     desc:"Proposals, speeches, executive emails and reports elevated to influence, persuade and impress."},
      {title:"Media & Broadcast Training",desc:"Camera presence, live TV, press conferences, podcast and public appearances — coached by former broadcast professionals."},
      {title:"Body Language & Presence",  desc:"Decode and command non-verbal signals. Project authority, confidence and trustworthiness in any room."},
    ]},
  { heading:"Leadership & Business Development", color:GOLD,
    desc:"Inspired by the best in executive coaching — develop the mindset and strategic edge of exceptional leaders.",
    services:[
      {title:"Peak Performance Coaching",        desc:"Break through limitations, remove blocks and consistently operate at your highest level — personally and professionally."},
      {title:"Business Communication Strategy",  desc:"Align your internal and external messaging, lead high-stakes negotiations and communicate vision that inspires action."},
      {title:"Team & Organisational Culture",    desc:"Build psychologically safe, high-performance teams with coaching in trust, feedback and cross-functional communication."},
      {title:"Strategic Storytelling",           desc:"Craft narratives that move people — for pitches, board presentations, media and change management."},
    ]},
  { heading:"International & Cross-Cultural", color:FOREST,
    desc:"Navigate the world's complexity with confidence — our specialist area grounded in 30+ countries of lived experience.",
    services:[
      {title:"Cross-Cultural Communication",           desc:"Bridge cultural gaps with diplomacy and intelligence. Understand what's said — and what isn't — in any international context."},
      {title:"Diplomatic & Government Communications", desc:"Liaised with international governments, diplomatic missions, government ministers and international organisations."},
      {title:"Multilingual Coaching",                  desc:"Executive coaching in English, French, Arabic and Urdu. Non-native English speaker specialist — nuance, authority and authentic voice."},
      {title:"International Media Relations",          desc:"Navigate global press, manage reputation across jurisdictions and perform with confidence on international platforms."},
    ]},
  { heading:"Personal Transformation & Life Coaching", color:GOLD,
    desc:"Holistic development for the whole person — because great communicators start from within.",
    services:[
      {title:"Executive Life Coaching",      desc:"Work-life integration, identity, purpose and resilience for leaders navigating high-pressure roles and personal transitions."},
      {title:"Mindset & Confidence Mastery", desc:"Overcome imposter syndrome, fear of public speaking and self-limiting beliefs that hold brilliant people back."},
      {title:"Career Transition Coaching",   desc:"Navigate leadership transitions, re-entry after career breaks, or pivots into new sectors — with clarity and confidence."},
      {title:"Personal Branding & Identity", desc:"Define and express your authentic leadership brand — online, offline and in every room you enter."},
    ]},
];

function renderCat(doc, cat, sy, fr,fg,fb, gr,gg,gb) {
  const [ar,ag,ab] = hexToRgb(cat.color);
  doc.setFillColor(ar,ag,ab); doc.rect(14,sy,3,16,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(11);
  doc.setTextColor(fr,fg,fb); doc.text(cat.heading,20,sy+7);
  doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
  doc.setTextColor(100,90,80);
  const dl = doc.splitTextToSize(cat.desc,172);
  doc.text(dl,20,sy+13);
  const gt = sy+14+dl.length*4;
  cat.services.forEach((s,i)=>{
    const col=i%2, row=Math.floor(i/2);
    const x=14+col*93, y=gt+row*34;
    doc.setFillColor(248,245,238); doc.roundedRect(x,y,89,30,2,2,"F");
    doc.setFillColor(ar,ag,ab);    doc.rect(x,y,2.5,30,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
    doc.setTextColor(fr,fg,fb); doc.text(s.title,x+6,y+8);
    doc.setFont("helvetica","normal"); doc.setFontSize(7);
    doc.setTextColor(70,65,58);
    doc.text(doc.splitTextToSize(s.desc,78),x+6,y+14);
  });
  return gt+68+8;
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function BrochureDownload({ className="" }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
      const [fr,fg,fb] = hexToRgb(FOREST);
      const [gr,gg,gb] = hexToRgb(GOLD);
      const [or_,og,ob] = hexToRgb(OLIVE);
      const [cr,cg,cb] = hexToRgb(CREAM);
      const [br,bg_,bb] = hexToRgb(BROWN);

      // Load images in parallel
      // coverBW = office/standing (page 1 cover, B&W)
      // laptopBW = laptop photo (page 2 about, B&W)
      // podiumBW = podium/keynote (page 3 skills, B&W)
      const [coverImg, laptopImg, podiumImg, logo] = await Promise.all([
        loadImg("https://media.base44.com/images/public/69dbb919df7f322227ac67eb/3a176c920_Gemini_Generated_Image_xlyc38xlyc38xlyc.png"),
        loadImg("https://media.base44.com/images/public/69dbb919df7f322227ac67eb/2bd511fbd_WhatsAppImage2026-04-26at0133121.jpg"),
        loadImg("https://media.base44.com/images/public/69dbb919df7f322227ac67eb/de332accf_Gemini_Generated_Image_9k9k29k9k29k9k29.png"),
        loadImg("https://media.base44.com/images/public/69dbb919df7f322227ac67eb/9be5ea7e6_NSC-logo-v5_1.png"),
      ]);

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 1 — COVER  (luxury split layout)
      // ═══════════════════════════════════════════════════════════════════════
      // Full cream background
      doc.setFillColor(cr,cg,cb); doc.rect(0,0,210,297,"F");

      // B&W photo — left half, portrait, natural crop (not stretched to full height)
      const photoH = 220; // leaves breathing room, not forced to 297
      if (coverImg) {
        doc.addImage(coverImg,"JPEG",0,0,105,photoH,undefined,"FAST");
        // subtle dark gradient only at bottom of photo
        doc.setFillColor(fr,fg,fb);
        doc.setGState(new doc.GState({opacity:0.5}));
        doc.rect(0,photoH-40,105,40,"F");
        doc.setGState(new doc.GState({opacity:1}));
      } else {
        doc.setFillColor(fr,fg,fb); doc.rect(0,0,105,photoH,"F");
      }

      // Forest fill below photo to bottom
      doc.setFillColor(fr,fg,fb); doc.rect(0,photoH,105,297-photoH,"F");

      // Gold vertical accent line
      doc.setFillColor(gr,gg,gb); doc.rect(103,0,2,297,"F");

      // Right panel — cream
      doc.setFillColor(cr,cg,cb); doc.rect(105,0,105,297,"F");

      // Logo top-right
      if (logo) {
        doc.addImage(logo,"PNG",118,14,38,38,undefined,"FAST");
      }
      goldRule(doc,118,56,82,gr,gg,gb);

      // Brand name below photo bottom-left
      doc.setFont("helvetica","bold"); doc.setFontSize(10);
      doc.setTextColor(gr,gg,gb); doc.text("NORTH SOUTH",10,photoH-22);
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5);
      doc.setTextColor(255,255,255); doc.text("CONSULTING & COACHING",10,photoH-15);
      doc.setFont("helvetica","italic"); doc.setFontSize(6);
      doc.setTextColor(180,170,150); doc.text("Navigating Excellence · Defining Direction",10,photoH-9);

      // Headline right panel
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5);
      doc.setTextColor(gr,gg,gb); doc.text("INTERNATIONAL EXECUTIVE COACHING",118,64);

      doc.setFont("helvetica","bold"); doc.setFontSize(25);
      doc.setTextColor(fr,fg,fb);
      doc.text("Navigate",118,78);
      doc.text("Your Path",118,90);
      doc.setFont("helvetica","italic"); doc.setFontSize(21);
      doc.setTextColor(gr,gg,gb); doc.text("to Extraordinary.",118,102);

      goldRule(doc,118,108,82,gr,gg,gb);

      // Intro
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
      doc.setTextColor(60,55,50);
      const intro = "Led by Nishat Ismail-Kemih and an elite team of international, multi-lingual coaches — transforming how leaders communicate, influence and impact across cultures and global stages.";
      doc.text(doc.splitTextToSize(intro,80),118,116);

      // Stats 2×2
      goldRule(doc,118,138,82,gr,gg,gb);
      const stats=[["17+","Countries"],["287+","Coached"],["12+","Languages & Cultures"],["20+","Years Experience"]];
      stats.forEach(([v,l],i)=>{
        const col=i%2, row=Math.floor(i/2);
        const x=118+col*42, y=147+row*19;
        doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.setTextColor(fr,fg,fb); doc.text(v,x,y);
        doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(gr,gg,gb); doc.text(l,x,y+5);
        doc.setFillColor(gr,gg,gb); doc.rect(x,y+7,14,0.35,"F");
      });
      goldRule(doc,118,190,82,gr,gg,gb);

      // Rumi quote
      doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(or_,og,ob);
      doc.text('"Raise your words,',118,199);
      doc.text('not your voice."',118,207);
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(100,90,80);
      doc.text("— Rumi",118,214);

      // 98% badge
      doc.setFillColor(or_,og,ob); doc.roundedRect(118,220,82,16,2,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.setTextColor(255,255,255);
      doc.text("98%",128,231);
      doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(gr,gg,gb);
      doc.text("Client Satisfaction Rate",149,231);

      // bottom forest bar right panel
      doc.setFillColor(fr,fg,fb); doc.rect(105,265,105,32,"F");
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(gr,gg,gb);
      doc.text("www.nsconsultd.com",118,275);
      doc.setTextColor(180,170,160); doc.setFontSize(6);
      doc.text("contact@nsconsultd.com  ·  +33 6 50 76 96 45",118,281);

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 2 — ABOUT NISHAT  (spacious — bio only, credentials, no skills)
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();
      doc.setFillColor(cr,cg,cb); doc.rect(0,0,210,297,"F");
      hdr(doc,fr,fg,fb,gr,gg,gb); ftr(doc,fr,fg,fb,gr,gg,gb,2);

      // Decorative forest left margin strip
      doc.setFillColor(fr,fg,fb); doc.rect(0,0,6,297,"F");
      doc.setFillColor(gr,gg,gb); doc.rect(6,0,1.5,297,"F");

      // Laptop photo — right column, B&W, full quality
      const p2PhotoW=70, p2PhotoH=110, p2PhotoX=134, p2PhotoY=20;
      if (laptopImg) {
        doc.addImage(laptopImg,"JPEG",p2PhotoX,p2PhotoY,p2PhotoW,p2PhotoH,undefined,"NONE");
        doc.setDrawColor(gr,gg,gb); doc.setLineWidth(0.5);
        doc.rect(p2PhotoX,p2PhotoY,p2PhotoW,p2PhotoH);
        // gold caption strip
        doc.setFillColor(or_,og,ob); doc.rect(p2PhotoX,p2PhotoY+p2PhotoH,p2PhotoW,7,"F");
        doc.setFont("helvetica","italic"); doc.setFontSize(5.5); doc.setTextColor(gr,gg,gb);
        doc.text("Nishat Ismail-Kemih — online masterclass",p2PhotoX+p2PhotoW/2,p2PhotoY+p2PhotoH+5,{align:"center"});
      }

      const bioColW = p2PhotoX - 18 - 6; // text column width leaving gap before photo

      // Section tag
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.setTextColor(br,bg_,bb); doc.text("ABOUT NISHAT",18,28);
      doc.setFillColor(gr,gg,gb); doc.rect(18,30,20,0.5,"F");

      // Big name
      doc.setFont("helvetica","bold"); doc.setFontSize(22);
      doc.setTextColor(fr,fg,fb); doc.text("Nishat Ismail-Kemih",18,40);
      doc.setFont("helvetica","italic"); doc.setFontSize(9);
      doc.setTextColor(gr,gg,gb);
      doc.text("Communication & Media Consultant  ·  English Coach  ·  UK",18,48);
      goldRule(doc,18,52,bioColW,gr,gg,gb);

      // Bio — left column alongside photo
      const bios = [
        "Nishat Ismail-Kemih is a UK-based communication and media consultant and English Coach with 20+ years of international experience. Nishat has worked across media, government, finance and automotive sectors — coaching executives, directing corporate films and advising on communication strategies globally.",
        "Her team coaches in four languages — English, French, Arabic and Urdu — making North South Consulting uniquely positioned to serve international executives and organisations operating across cultural boundaries.",
        "Nishat has worked on projects for Canon, Stellantis, Kellogg's, Al Jazeera, BBC, National Geographic, HSBC, ITV, Channel 4, Channel 5, Qatar Media Corporation, Gulf Drilling International, and numerous government and diplomatic organisations.",
      ];
      let by=60;
      bios.forEach(para=>{
        doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(55,50,45);
        const lines=doc.splitTextToSize(para,bioColW);
        doc.text(lines,18,by);
        by+=lines.length*5.6+7;
      });

      // After photo ends, go full width for credentials
      const credStartY = Math.max(by, p2PhotoY+p2PhotoH+12);

      // Gold divider full width
      goldRule(doc,18,credStartY,178,gr,gg,gb);
      by = credStartY + 10;

      // Credentials — 2 columns, spacious
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
      doc.setTextColor(gr,gg,gb); doc.text("CREDENTIALS & BACKGROUND",18,by);
      doc.setFillColor(gr,gg,gb); doc.rect(18,by+2,36,0.4,"F");
      by+=12;

      credentials.forEach((c,i)=>{
        const col=i%2, row=Math.floor(i/2);
        const x=18+col*92, y=by+row*11;
        doc.setFillColor(248,245,238); doc.roundedRect(x,y-5,88,9,1.5,1.5,"F");
        doc.setFillColor(gr,gg,gb); doc.circle(x+5,y-0.5,1.1,"F");
        doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(55,50,45);
        doc.text(c,x+10,y);
      });

      by+=Math.ceil(credentials.length/2)*11+14;

      // Rumi quote block
      doc.setFillColor(or_,og,ob); doc.roundedRect(18,by,178,26,3,3,"F");
      doc.setFont("helvetica","italic"); doc.setFontSize(11); doc.setTextColor(255,255,255);
      doc.text('"It is rain that grows flowers, not thunder."',107,by+11,{align:"center"});
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(gr,gg,gb);
      doc.text("— Rumi",107,by+20,{align:"center"});

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 3 — SKILLS & CLIENTS (with podium photo accent)
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();
      doc.setFillColor(cr,cg,cb); doc.rect(0,0,210,297,"F");
      hdr(doc,fr,fg,fb,gr,gg,gb); ftr(doc,fr,fg,fb,gr,gg,gb,3);

      doc.setFillColor(fr,fg,fb); doc.rect(0,0,6,297,"F");
      doc.setFillColor(gr,gg,gb); doc.rect(6,0,1.5,297,"F");

      // Skills section — left col
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.setTextColor(br,bg_,bb); doc.text("SKILLS & EXPERTISE",18,27);
      doc.setFillColor(gr,gg,gb); doc.rect(18,29,28,0.5,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(18);
      doc.setTextColor(fr,fg,fb); doc.text("What Nishat brings",18,39);
      doc.setFont("helvetica","italic"); doc.setFontSize(14);
      doc.setTextColor(gr,gg,gb); doc.text("to every engagement",18,48);
      goldRule(doc,18,52,178,gr,gg,gb);

      // 4 skill cards — full width 2×2 grid
      skills.forEach((s,i)=>{
        const col=i%2, row=Math.floor(i/2);
        const x=18+col*93, y=58+row*44;
        doc.setFillColor(248,245,238); doc.roundedRect(x,y,89,40,2.5,2.5,"F");
        doc.setFillColor(or_,og,ob); doc.rect(x,y,3,40,"F");
        doc.setFont("helvetica","normal"); doc.setFontSize(20); doc.setTextColor(150,116,98);
        doc.text(s.num,x+7,y+16);
        doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(fr,fg,fb);
        doc.text(doc.splitTextToSize(s.title,74),x+7,y+24);
        doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(100,90,80);
        doc.text(doc.splitTextToSize(s.desc,74),x+7,y+32);
      });

      // ── CLIENTS & ORGANISATIONS ────────────────────────────────────────────
      const clStartY = 58 + 2*44 + 10; // below skills cards
      // Header band
      doc.setFillColor(fr,fg,fb); doc.roundedRect(18,clStartY,178,13,2,2,"F");
      doc.setFillColor(gr,gg,gb); doc.rect(18,clStartY,178,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5);
      doc.setTextColor(gr,gg,gb); doc.text("CLIENTS & ORGANISATIONS",107,clStartY+8,{align:"center"});

      // Subheading
      doc.setFont("helvetica","italic"); doc.setFontSize(8);
      doc.setTextColor(100,90,80); doc.text("A global roster trusted across major sectors",107,clStartY+20,{align:"center"});
      doc.setFillColor(gr,gg,gb); doc.rect(68,clStartY+22,74,0.35,"F");

      // Client cards — 4 col, alternating forest / olive
      const pillW=42, pillH=9;
      clients.forEach((c,i)=>{
        const col=i%4, row=Math.floor(i/4);
        const px=18+col*45, py=clStartY+26+row*12;
        const isOlive=row%2===0;
        if(isOlive){ doc.setFillColor(or_,og,ob); } else { doc.setFillColor(fr,fg,fb); }
        doc.roundedRect(px,py,pillW,pillH,1.5,1.5,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(gr,gg,gb);
        doc.text(c,px+pillW/2,py+6.2,{align:"center"});
      });

      // Sectors — gold strip
      const sectY=clStartY+26+Math.ceil(clients.length/4)*12+6;
      doc.setFillColor(gr,gg,gb); doc.roundedRect(18,sectY,178,9,1.5,1.5,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(6);
      doc.setTextColor(fr,fg,fb);
      doc.text(sectors.join("   ·   "),107,sectY+5.8,{align:"center"});

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 3.5 — FULL BLEED PODIUM PHOTO PAGE (between p3 and p4)
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();
      doc.setFillColor(fr,fg,fb); doc.rect(0,0,210,297,"F");
      if (podiumImg) {
        // Full page, original proportions, centred
        doc.addImage(podiumImg,"JPEG",0,0,210,297,undefined,"NONE");
      }
      // Forest overlay at top for text legibility
      doc.setFillColor(fr,fg,fb);
      doc.setGState(new doc.GState({opacity:0.55}));
      doc.rect(0,0,210,40,"F");
      doc.setGState(new doc.GState({opacity:1}));
      // Gold line accent
      doc.setFillColor(gr,gg,gb); doc.rect(0,40,210,1.5,"F");
      // Brand text over photo
      doc.setFont("helvetica","bold"); doc.setFontSize(8);
      doc.setTextColor(gr,gg,gb); doc.text("NORTH SOUTH CONSULTING & COACHING",105,14,{align:"center"});
      doc.setFont("helvetica","italic"); doc.setFontSize(22);
      doc.setTextColor(255,255,255); doc.text('"Navigating Excellence.',105,27,{align:"center"});
      doc.setFont("helvetica","italic"); doc.setFontSize(22);
      doc.setTextColor(gr,gg,gb); doc.text('Defining Direction."',105,37,{align:"center"});
      // Bottom caption band
      doc.setFillColor(fr,fg,fb);
      doc.setGState(new doc.GState({opacity:0.65}));
      doc.rect(0,265,210,32,"F");
      doc.setGState(new doc.GState({opacity:1}));
      doc.setFillColor(gr,gg,gb); doc.rect(0,265,210,1.5,"F");
      doc.setFont("helvetica","italic"); doc.setFontSize(8);
      doc.setTextColor(255,255,255); doc.text("Nishat Ismail-Kemih — keynote address",105,278,{align:"center"});
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.setTextColor(gr,gg,gb); doc.text("www.nsconsultd.com  ·  contact@nsconsultd.com",105,288,{align:"center"});

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 4 — SERVICES 1 & 2
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();
      doc.setFillColor(cr,cg,cb); doc.rect(0,0,210,297,"F");
      hdr(doc,fr,fg,fb,gr,gg,gb); ftr(doc,fr,fg,fb,gr,gg,gb,5);
      doc.setFillColor(fr,fg,fb); doc.rect(0,0,6,297,"F");
      doc.setFillColor(gr,gg,gb); doc.rect(6,0,1.5,297,"F");

      // Services banner
      doc.setFillColor(fr,fg,fb); doc.roundedRect(18,22,178,24,2,2,"F");
      doc.setFillColor(or_,og,ob);
      doc.setGState(new doc.GState({opacity:0.35}));
      doc.roundedRect(18,22,178,24,2,2,"F");
      doc.setGState(new doc.GState({opacity:1}));
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5);
      doc.setTextColor(gr,gg,gb); doc.text("WHAT WE OFFER",107,29,{align:"center"});
      doc.setFont("helvetica","bold"); doc.setFontSize(16);
      doc.setTextColor(255,255,255); doc.text("Comprehensive Coaching Programmes",107,37,{align:"center"});
      doc.setFont("helvetica","italic"); doc.setFontSize(9);
      doc.setTextColor(gr,gg,gb); doc.text("for every dimension of leadership",107,43,{align:"center"});

      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(70,65,58);
      const si="From verbal mastery to cross-cultural diplomacy, from media training to personal transformation — our services cover the full spectrum of executive communication and leadership development.";
      doc.text(doc.splitTextToSize(si,178),18,54);
      goldRule(doc,18,62,178,gr,gg,gb);

      let cy=67;
      cy=renderCat(doc,serviceCategories[0],cy,fr,fg,fb,gr,gg,gb);
      cy+=4;
      renderCat(doc,serviceCategories[1],cy,fr,fg,fb,gr,gg,gb);

      // ═══════════════════════════════════════════════════════════════════════
      // PAGE 5 — SERVICES 3 & 4 + CONNECT WITH NISHAT (merged closing)
      // ═══════════════════════════════════════════════════════════════════════
      doc.addPage();
      doc.setFillColor(cr,cg,cb); doc.rect(0,0,210,297,"F");
      hdr(doc,fr,fg,fb,gr,gg,gb); ftr(doc,fr,fg,fb,gr,gg,gb,6);
      doc.setFillColor(fr,fg,fb); doc.rect(0,0,6,297,"F");
      doc.setFillColor(gr,gg,gb); doc.rect(6,0,1.5,297,"F");

      let cy2=22;
      cy2=renderCat(doc,serviceCategories[2],cy2,fr,fg,fb,gr,gg,gb);
      cy2+=4;
      cy2=renderCat(doc,serviceCategories[3],cy2,fr,fg,fb,gr,gg,gb);

      // ── MERGED CLOSING: Ready to Begin + Connect with Nishat ──────────────
      const ctaY=cy2+6;
      // Outer forest block
      doc.setFillColor(fr,fg,fb); doc.roundedRect(18,ctaY,178,50,3,3,"F");
      // Gold top accent
      doc.setFillColor(gr,gg,gb); doc.rect(18,ctaY,178,2,"F");

      // Left half: Ready to Begin
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5);
      doc.setTextColor(gr,gg,gb); doc.text("READY TO BEGIN?",58,ctaY+9,{align:"center"});
      doc.setFont("helvetica","bold"); doc.setFontSize(13);
      doc.setTextColor(255,255,255); doc.text("Every transformation",58,ctaY+18,{align:"center"});
      doc.setFont("helvetica","italic"); doc.setFontSize(12);
      doc.text("starts with a conversation.",58,ctaY+26,{align:"center"});
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.setTextColor(180,170,160);
      doc.text("No commitment — just clarity.",58,ctaY+33,{align:"center"});

      // Vertical gold divider
      doc.setFillColor(gr,gg,gb); doc.rect(107,ctaY+6,0.5,38,"F");

      // Right half: Connect with Nishat
      doc.setFont("helvetica","bold"); doc.setFontSize(6.5);
      doc.setTextColor(gr,gg,gb); doc.text("CONNECT WITH NISHAT",158,ctaY+9,{align:"center"});
      doc.setFillColor(gr,gg,gb); doc.rect(120,ctaY+11,76,0.3,"F");

      const contacts=[
        { label:"TEL",   value:"+33 6 50 76 96 45" },
        { label:"MSG",   value:"WhatsApp · Teams · Zoom" },
        { label:"EMAIL", value:"contact@nsconsultd.com" },
        { label:"WEB",   value:"www.nsconsultd.com" },
      ];
      contacts.forEach(({label,value},i)=>{
        const y=ctaY+18+i*8;
        // Label pill
        doc.setFillColor(gr,gg,gb); doc.roundedRect(110,y-4.5,12,6,1,1,"F");
        doc.setFont("helvetica","bold"); doc.setFontSize(5.5); doc.setTextColor(fr,fg,fb);
        doc.text(label,116,y-0.5,{align:"center"});
        // Value
        doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(220,210,200);
        doc.text(value,125,y);
      });

      // ── Save ──────────────────────────────────────────────────────────────
      const blob=doc.output("blob");
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url; a.download="NorthSouthConsulting-Brochure.pdf";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);

    } catch(err) {
      console.error("PDF error:",err);
      alert("There was an issue generating the PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={loading}
      className={`rounded-full gap-2 font-inter ${className}`}
      style={{backgroundColor:FOREST, color:CREAM}}>
      <Download className="w-4 h-4"/>
      {loading ? "Generating PDF…" : "Download Brochure"}
    </Button>
  );
}