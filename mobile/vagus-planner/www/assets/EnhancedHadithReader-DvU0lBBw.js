import{r as s,v as ne,y as le,z as ie,x as c,A as n,B as e,D as l,E as A,F as E,Z as L,I as i,$ as ce,a0 as oe,a1 as O,a2 as M,ae as $,J as o,N as j,af as de,a3 as F,a4 as P,a5 as B,a6 as D,a7 as d,H as y,ad as G,aa as Q,ai as V,Q as he,V as xe,G as me,ac as ue,aj as pe}from"./index-CU36zJQY.js";const ge=[{value:"sahih_bukhari",label:"Sahih Bukhari"},{value:"sahih_muslim",label:"Sahih Muslim"},{value:"sunan_abu_dawood",label:"Sunan Abu Dawood"},{value:"jami_tirmidhi",label:"Jami' al-Tirmidhi"},{value:"sunan_nasai",label:"Sunan an-Nasa'i"},{value:"sunan_ibn_majah",label:"Sunan Ibn Majah"},{value:"musnad_ahmad",label:"Musnad Ahmad"},{value:"riyad_as_salihin",label:"Riyad as Salihin (The Gardens of the Righteous)"},{value:"hadith_qudsi",label:"Hadith Qudsi"}],je=["faith","prayer","charity","fasting","hajj","character","knowledge","family","general"];function Ne({onClose:ye=()=>{}}){const[h,q]=s.useState(""),[b,Y]=s.useState([]),[N,f]=s.useState(!1),[t,z]=s.useState(null),[K,v]=s.useState(!1),[S,w]=s.useState(null),[C,H]=s.useState(!1),[_,T]=s.useState([]),[R,k]=s.useState(!1),[x,J]=s.useState("all"),[m,U]=s.useState("all"),[u,W]=s.useState(""),X=ne(),{data:p=[]}=le({queryKey:["user-hadiths"],queryFn:()=>c.entities.Hadith.list("-created_date",50)}),Z=ie({mutationFn:a=>c.entities.Hadith.create(a),onSuccess:()=>{X.invalidateQueries(["user-hadiths"]),n.success("Hadith saved!")}}),I=async()=>{if(!h.trim()){n.error("Please enter a search term");return}f(!0);try{const a=await c.integrations.Core.InvokeLLM({prompt:`Search for authentic Hadiths based on: "${h}"

${x!=="all"?`COLLECTION FILTER: ${x}`:""}
${m!=="all"?`CATEGORY FILTER: ${m}`:""}
${u?`NARRATOR FILTER: ${u}`:""}

SEARCH STRATEGY:
1. Direct keyword matches in Hadith text
2. Thematic relevance and related concepts
3. Similar teachings or guidance
4. Context-based matching (life situations, moral guidance, etc.)

PRIORITY:
- Sahih (authentic) Hadiths first
- Most relevant to search query
- Clear, actionable guidance
- Diverse perspectives on the topic

Return up to 10 most relevant Hadiths with this structure:
{
  "results": [
    {
      "arabic_text": "Hadith in Arabic (if available, with proper diacritics)",
      "english_translation": "clear, accurate English translation",
      "narrator": "narrator name (e.g., Abu Hurairah, Aisha)",
      "source": "collection name (e.g., Sahih Bukhari, Sahih Muslim)",
      "reference": "book and hadith number (e.g., Book 2, Hadith 123)",
      "category": "category from: faith/prayer/charity/fasting/hajj/character/knowledge/family/general",
      "relevance": "why this hadith matches the search (1-2 sentences)",
      "grade": "authenticity grade (Sahih/Hasan/Daif)",
      "keywords": ["key", "words", "from", "hadith"]
    }
  ]
}

IMPORTANT: Only return Hadiths from authentic, recognized collections. Verify accuracy.`,response_json_schema:{type:"object",properties:{results:{type:"array",items:{type:"object",properties:{arabic_text:{type:"string"},english_translation:{type:"string"},narrator:{type:"string"},source:{type:"string"},reference:{type:"string"},category:{type:"string"},relevance:{type:"string"},grade:{type:"string"},keywords:{type:"array",items:{type:"string"}}}}}}},add_context_from_internet:!0});Y(a.results||[]),a.results.length===0&&n.info("No Hadiths found matching your search")}catch(a){n.error("Search failed"),console.error(a)}finally{f(!1)}},ee=async a=>{H(!0);try{const r=await c.integrations.Core.InvokeLLM({prompt:`Provide a comprehensive, structured explanation of this Hadith:

Hadith: ${a.english_translation}
Narrator: ${a.narrator}
Source: ${a.source} ${a.reference}

Structure your response with these clear sections:

📖 HISTORICAL CONTEXT
When and why was this Hadith narrated? What was the situation? (2-3 sentences)

💡 KEY TEACHINGS
List the main lessons and principles (4-5 bullet points):
• Point 1
• Point 2
• etc.

🌟 PRACTICAL APPLICATION
How can Muslims apply this in modern life? Provide specific, actionable guidance (3-4 sentences with examples)

📚 SCHOLARLY INSIGHTS
Brief commentary from classical and contemporary Islamic scholars, including any important nuances or interpretations

⚠️ COMMON MISUNDERSTANDINGS
If applicable, address any common misconceptions about this Hadith

Format with clear section headers and make it educational yet accessible.`,add_context_from_internet:!0});w(r),v(!0)}catch{n.error("Failed to load explanation")}finally{H(!1)}},ae=async a=>{k(!0);try{const r=await c.integrations.Core.InvokeLLM({prompt:`Find 3-5 related Hadiths that complement or expand on this theme:

Hadith: ${a.english_translation}
Category: ${a.category}

Find Hadiths with:
- Similar themes or teachings
- Complementary guidance
- Additional context

Return as:
{
  "hadiths": [
    {
      "english_translation": "translation",
      "narrator": "narrator",
      "source": "source",
      "reference": "reference",
      "connection": "how it relates to the main hadith"
    }
  ]
}`,response_json_schema:{type:"object",properties:{hadiths:{type:"array",items:{type:"object",properties:{english_translation:{type:"string"},narrator:{type:"string"},source:{type:"string"},reference:{type:"string"},connection:{type:"string"}}}}}}});T(r.hadiths||[])}catch{n.error("Failed to load related Hadiths")}finally{k(!1)}},se=a=>{z(a),v(!1),w(null),T([])},te=a=>{Z.mutate({arabic_text:a.arabic_text||"",english_translation:a.english_translation,narrator:a.narrator,source:a.source,reference:a.reference,category:a.category||"general",is_favorite:!0})};return e.jsxs(l,{className:"border-amber-200",children:[e.jsx(A,{children:e.jsxs(E,{className:"flex items-center gap-2 text-amber-900",children:[e.jsx(L,{className:"w-5 h-5"}),"Hadith Reader"]})}),e.jsx(i,{children:e.jsxs(ce,{defaultValue:"search",className:"space-y-4",children:[e.jsxs(oe,{className:"mx-4 mt-4",children:[e.jsx(O,{value:"search",children:"Search"}),e.jsxs(O,{value:"saved",children:["Saved (",p.length,")"]})]}),e.jsxs(M,{value:"search",className:"space-y-6",children:[e.jsx(l,{className:"border-amber-200",children:e.jsxs(i,{className:"p-4 space-y-4",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsx($,{placeholder:"Search by keyword, topic, or theme...",value:h,onChange:a=>q(a.target.value),onKeyPress:a=>a.key==="Enter"&&I(),className:"flex-1"}),e.jsx(o,{onClick:I,disabled:N,children:N?e.jsx(j,{className:"w-4 h-4 animate-spin"}):e.jsx(de,{className:"w-4 h-4"})})]}),e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[e.jsxs(F,{value:x,onValueChange:J,children:[e.jsx(P,{children:e.jsx(B,{placeholder:"Collection"})}),e.jsxs(D,{children:[e.jsx(d,{value:"all",children:"All Collections"}),ge.map(a=>e.jsx(d,{value:a.value,children:a.label},a.value))]})]}),e.jsxs(F,{value:m,onValueChange:U,children:[e.jsx(P,{children:e.jsx(B,{placeholder:"Category"})}),e.jsxs(D,{children:[e.jsx(d,{value:"all",children:"All Categories"}),je.map(a=>e.jsx(d,{value:a,children:a.charAt(0).toUpperCase()+a.slice(1)},a))]})]}),e.jsx($,{placeholder:"Narrator...",value:u,onChange:a=>W(a.target.value)})]})]})}),b.length>0&&e.jsxs("div",{className:"grid lg:grid-cols-2 gap-4",children:[e.jsx("div",{className:"space-y-3",children:b.map((a,r)=>e.jsx(l,{className:`cursor-pointer transition-all ${t===a?"border-amber-500 shadow-lg":"border-amber-200 hover:shadow-md"}`,onClick:()=>se(a),children:e.jsxs(i,{className:"p-4",children:[e.jsxs("div",{className:"flex items-start justify-between mb-2",children:[e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx(y,{className:"bg-amber-600",children:a.grade}),e.jsx(y,{variant:"outline",children:a.category})]}),e.jsx(o,{size:"icon",variant:"ghost",onClick:g=>{g.stopPropagation(),te(a)},children:e.jsx(G,{className:"w-4 h-4"})})]}),e.jsx("p",{className:"text-sm text-slate-700 line-clamp-3 mb-2",children:a.english_translation}),a.relevance&&e.jsxs("div",{className:"text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded mb-2 italic",children:[e.jsx(Q,{className:"w-3 h-3 inline mr-1"}),a.relevance]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2 text-xs text-slate-500",children:[e.jsx("span",{children:a.narrator}),e.jsx("span",{children:"•"}),e.jsx("span",{children:a.source})]}),a.keywords&&a.keywords.length>0&&e.jsx("div",{className:"flex gap-1",children:a.keywords.slice(0,2).map((g,re)=>e.jsx("span",{className:"text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-600",children:g},re))})]})]})},r))}),t&&e.jsx("div",{className:"space-y-4",children:e.jsx(l,{className:"border-amber-200 sticky top-0",children:e.jsxs(i,{className:"p-6 space-y-4",children:[t.arabic_text&&e.jsx("div",{className:"p-4 bg-amber-50 rounded-xl",children:e.jsx("p",{className:"text-right text-xl leading-relaxed font-arabic text-amber-900",dir:"rtl",children:t.arabic_text})}),e.jsx("div",{className:"p-4 bg-white border border-amber-200 rounded-xl",children:e.jsx("p",{className:"text-slate-700 leading-relaxed",children:t.english_translation})}),e.jsxs("div",{className:"flex flex-wrap gap-2 text-sm text-slate-600",children:[e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx(L,{className:"w-4 h-4"}),t.source]}),e.jsx("span",{children:"•"}),e.jsx("span",{children:t.reference}),e.jsx("span",{children:"•"}),e.jsxs("span",{children:["Narrated by ",t.narrator]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[e.jsxs(o,{onClick:()=>ee(t),disabled:C,variant:"outline",className:"border-purple-300",children:[C?e.jsx(j,{className:"w-4 h-4 mr-2 animate-spin"}):e.jsx(Q,{className:"w-4 h-4 mr-2"}),"Explain"]}),e.jsxs(o,{onClick:()=>ae(t),disabled:R,variant:"outline",className:"border-blue-300",children:[R?e.jsx(j,{className:"w-4 h-4 mr-2 animate-spin"}):e.jsx(V,{className:"w-4 h-4 mr-2"}),"Related"]})]}),e.jsx(he,{children:K&&S&&e.jsx(xe.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},children:e.jsxs(l,{className:"bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200",children:[e.jsx(A,{children:e.jsxs(E,{className:"flex items-center gap-2 text-purple-900 text-base",children:[e.jsx(me,{className:"w-4 h-4"}),"Explanation & Context"]})}),e.jsx(i,{children:e.jsx("div",{className:"prose prose-sm max-w-none text-purple-900 whitespace-pre-line",children:S})})]})})}),_.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs("h4",{className:"font-semibold text-blue-900 flex items-center gap-2",children:[e.jsx(V,{className:"w-4 h-4"}),"Related Hadiths"]}),_.map((a,r)=>e.jsxs("div",{className:"p-3 bg-blue-50 rounded-lg border border-blue-200",children:[e.jsx("p",{className:"text-sm text-blue-900 mb-2",children:a.english_translation}),e.jsxs("div",{className:"text-xs text-blue-600 mb-1",children:[a.narrator," • ",a.source," ",a.reference]}),e.jsxs("div",{className:"text-xs text-blue-700 italic",children:[e.jsx(ue,{className:"w-3 h-3 inline mr-1"}),a.connection]})]},r))]})]})})})]})]}),e.jsxs(M,{value:"saved",className:"space-y-3",children:[p.map(a=>e.jsx(l,{className:"border-amber-200",children:e.jsxs(i,{className:"p-4",children:[a.arabic_text&&e.jsx("div",{className:"p-3 bg-amber-50 rounded-lg mb-3",children:e.jsx("p",{className:"text-right text-lg leading-relaxed font-arabic text-amber-900",dir:"rtl",children:a.arabic_text})}),e.jsx("p",{className:"text-slate-700 leading-relaxed mb-3",children:a.english_translation}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"text-sm text-slate-600",children:[a.narrator," • ",a.source]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(y,{children:a.category}),a.is_favorite&&e.jsx(pe,{className:"w-4 h-4 fill-rose-500 text-rose-500"})]})]}),a.notes&&e.jsxs("div",{className:"mt-3 pt-3 border-t text-sm text-slate-600",children:[e.jsx("strong",{children:"Notes:"})," ",a.notes]})]})},a.id)),p.length===0&&e.jsxs("div",{className:"text-center py-12 text-slate-500",children:[e.jsx(G,{className:"w-12 h-12 mx-auto mb-2 text-slate-300"}),e.jsx("p",{children:"No saved Hadiths yet. Search and save to build your collection!"})]})]})]})})]})}export{Ne as default};
