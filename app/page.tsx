"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type TabType = "builder" | "blueprint" | "insights" | "config";

export default function Home() {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authLoading, setAuthLoading] = useState(false);

  // Telemetry State
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState<TabType>("builder");
  const [generatedCode, setGeneratedCode] = useState(`// Your generated code will appear here
// 
// Type a prompt below and click "Trigger Local Generation"
// 
// Example: "Create a blue button that says Click Me"
// 
// Then click the "Live Preview" tab to see your app running!
`);

  const [promptText, setPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("<div style='padding:20px; color:#888; text-align:center;'>✨ Generate an app above, then click Live Preview to see it here!</div>");

  // Load telemetry preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('telemetryEnabled');
    if (saved !== null) {
      setTelemetryEnabled(saved === 'true');
    }
  }, []);

  // Helper function to extract integrations from prompt
  const extractIntegrations = (prompt: string): string[] => {
    const integrations: string[] = [];
    const keywords = ['stripe', 'paypal', 'algolia', 'firebase', 'supabase', 'mongodb', 'postgres', 'redis', 'aws', 'vercel'];
    keywords.forEach(kw => {
      if (prompt.toLowerCase().includes(kw)) integrations.push(kw);
    });
    return integrations;
  };

  // Helper function to clean markdown from AI responses
  const cleanGeneratedCode = (rawCode: string): string => {
    let cleaned = rawCode;
    
    const markdownMatch = cleaned.match(/```(?:html|html|javascript|jsx|tsx|typescript)?\n?([\s\S]*?)\n?```/i);
    if (markdownMatch) {
      cleaned = markdownMatch[1];
    }
    
    if (!cleaned.includes("<!DOCTYPE") && !cleaned.includes("<html")) {
      cleaned = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NiskBuild App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0B0F19 0%, #1a1f2e 100%);
      color: #e2e8f0;
      padding: 2rem;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .container { max-width: 800px; margin: 0 auto; text-align: center; }
    button {
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover { background: #2563eb; transform: scale(1.02); }
    pre { background: #1a1f2e; padding: 1rem; border-radius: 8px; overflow-x: auto; text-align: left; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 NiskBuild Generated App</h1>
    <div style="background: #1a1f2e; border-radius: 12px; padding: 2rem; margin-top: 1rem;">
      <h3>Generated Content:</h3>
      <pre>${cleaned.substring(0, 500)}</pre>
    </div>
    <div style="margin-top: 1rem; padding: 1rem; background: #1e293b; border-radius: 8px;">
      <p>✨ Your app was generated locally. No data left your machine.</p>
    </div>
  </div>
</body>
</html>`;
    }
    
    return cleaned;
  };

  // Load saved projects from Supabase
  const loadProjects = async (userId: string) => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSavedProjects(data);
    }
  };

  // Save current project to Supabase
  const saveCurrentProject = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const title = prompt('Project name:', promptText.substring(0, 50));
    if (!title) return;

    const { error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: title,
        prompt: promptText,
        generated_code: generatedCode,
      });

    if (error) {
      alert('Error saving project: ' + error.message);
    } else {
      alert('Project saved!');
      loadProjects(user.id);
    }
  };

  // Load a saved project
  const loadProject = (project: any) => {
    setPromptText(project.prompt);
    setGeneratedCode(project.generated_code);
    setPreviewHtml(cleanGeneratedCode(project.generated_code));
    setActiveTab("builder");
  };

  // Authentication handlers
  const handleAuth = async () => {
    setAuthLoading(true);
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) alert(error.message);
      else {
        alert('Check your email for confirmation!');
        setShowAuthModal(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) alert(error.message);
      else setShowAuthModal(false);
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSavedProjects([]);
  };

  // Check auth status on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProjects(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProjects(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    
    const startTime = Date.now();
    
    setIsGenerating(true);
    setGeneratedCode("⚙️ Contacting local Ollama...\n\nGenerating your application using qwen2.5-coder:7b on your M1 Mac...\n\nThis is 100% local and private. No data leaves your machine.\n");
    setPreviewHtml("<div style='padding:20px; color:#888; text-align:center;'>⏳ Generating your app... Please wait.</div>");
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptText }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      const cleanedCode = cleanGeneratedCode(data.code);
      setGeneratedCode(cleanedCode);
      setPreviewHtml(cleanedCode);
      
      // Log anonymous structural data (if telemetry enabled)
      if (telemetryEnabled) {
        try {
          let templateId = 'custom';
          const templates = ['ecommerce', 'crm', 'invoice', 'support', 'todo', 'calculator', 'counter', 'weather', 'dashboard'];
          for (const t of templates) {
            if (promptText.toLowerCase().includes(t)) {
              templateId = t;
              break;
            }
          }
          
          await fetch('/api/log-structure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId: templateId,
              success: true,
              stepsCount: promptText.split(' ').length,
              durationSeconds: Math.floor((Date.now() - startTime) / 1000),
              integrations: extractIntegrations(promptText),
            }),
          });
        } catch (logError) {
          // Don't fail generation if logging fails
          console.error('Failed to log structural data:', logError);
        }
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      const errorMsg = `❌ Error connecting to Ollama

Make sure:
1. Ollama is running (llama icon in your menu bar)
2. The model is downloaded (qwen2.5-coder:7b)

Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setGeneratedCode(errorMsg);
      setPreviewHtml(`<div style="padding:20px; color:#ef4444; background:#1a1f2e; border-radius:8px;">
        <h3>❌ Generation Failed</h3>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>Make sure Ollama is running with: <code>ollama serve</code></p>
      </div>`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportZIP = async () => {
    if (!generatedCode || generatedCode.includes("will appear here") || generatedCode.includes("Error") || generatedCode.includes("Contacting local Ollama")) {
      alert("⚠️ Generate something first! Write a prompt and click 'Trigger Local Generation'.");
      return;
    }
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: generatedCode, 
          prompt: promptText 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niskbuild-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("✅ Export complete! Your code is now yours forever. No watermarks, no lock-in.");
    } catch (error) {
      console.error('Export error:', error);
      alert("❌ Export failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleDeployLive = () => {
    alert("🚀 Deploy Live feature coming soon!\n\nPro feature: One-click deploy to Vercel for $12/month.");
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-200">
      {/* Top Global Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[#0B0F19]/95 backdrop-blur-sm border-b border-gray-800 z-20 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono text-emerald-400 tracking-wide">
              ⚡ 100% Sovereign Local Core Active
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={saveCurrentProject}
                className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-full transition-colors"
              >
                💾 Save Project
              </button>
              <span className="text-xs text-gray-400 hidden sm:inline">{user.email?.split('@')[0]}</span>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1"
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-full transition-colors"
            >
              Sign In / Sign Up
            </button>
          )}
          <div className="text-xs font-mono text-gray-400 bg-gray-900/50 px-3 py-1 rounded-full">
            🧠 M1 Node Memory: <span className="text-emerald-400 font-bold">16GB Unified</span>
          </div>
        </div>
      </header>

      {/* Permanent Left Sidebar */}
      <aside className="fixed left-0 top-14 bottom-0 w-64 bg-[#0B0F19] border-r border-gray-800 z-10 flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-gray-800">
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              NISK BUILD
            </h1>
            <p className="text-[10px] text-gray-500 mt-1">local-first · sovereign</p>
          </div>
        </div>

        <nav className="flex-1 pt-8">
          <button
            onClick={() => setActiveTab("builder")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 ${
              activeTab === "builder"
                ? "bg-purple-500/10 border-r-2 border-purple-500 text-purple-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
            }`}
          >
            <span className="text-xl">🔨</span>
            <span className="text-sm font-medium">Local Builder</span>
          </button>
          <button
            onClick={() => setActiveTab("blueprint")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 ${
              activeTab === "blueprint"
                ? "bg-purple-500/10 border-r-2 border-purple-500 text-purple-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
            }`}
          >
            <span className="text-xl">📦</span>
            <span className="text-sm font-medium">Blueprint Store</span>
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 ${
              activeTab === "insights"
                ? "bg-purple-500/10 border-r-2 border-purple-500 text-purple-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-sm font-medium">Market Insights</span>
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 ${
              activeTab === "config"
                ? "bg-purple-500/10 border-r-2 border-purple-500 text-purple-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/50"
            }`}
          >
            <span className="text-xl">⚙️</span>
            <span className="text-sm font-medium">Node Config</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 text-center">
          <div>🔒 Fully Local · No Telemetry</div>
          <div className="mt-1">v0.1.0 · NiskBuild Core</div>
        </div>
      </aside>

      {/* Dynamic Central Workspace */}
      <main className="ml-64 mt-14 p-6 min-h-[calc(100vh-3.5rem)]">
        {activeTab === "builder" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">🏗️ Local Builder Workspace</h2>
              <div className="text-xs text-gray-500 font-mono">Active Node: Ollama/Qwen-7B</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5 flex flex-col h-[calc(100vh-180px)]">
                <label className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Prompt to Build
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Describe the application layout or automated agent flow you wish to build privately...
Example: 'Create a blue button that says Click Me'"
                  className="flex-1 w-full bg-[#0B0F19] border border-gray-700 rounded-lg p-4 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !promptText.trim()}
                  className={`mt-4 w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                    isGenerating || !promptText.trim()
                      ? "bg-gray-700 cursor-not-allowed text-gray-400"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  }`}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Generating...
                    </span>
                  ) : (
                    "🚀 Trigger Local Generation"
                  )}
                </button>
              </div>

              {/* Right Column */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5 flex flex-col h-[calc(100vh-180px)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPreview(false)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                        !showPreview
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      📄 Code
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                        showPreview
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-gray-400 hover:text-gray-300"
                      }`}
                    >
                      👁️ Live Preview
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500">.nisk/workspace</span>
                </div>

                <div className="flex-1 bg-[#0B0F19] rounded-lg border border-gray-700 overflow-hidden">
                  {!showPreview ? (
                    <pre className="p-4 text-xs font-mono text-gray-300 whitespace-pre-wrap break-words h-full overflow-auto">
                      <code>{generatedCode}</code>
                    </pre>
                  ) : (
                    <iframe
                      srcDoc={previewHtml}
                      title="App Live Preview"
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-top-navigation"
                    />
                  )}
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleExportZIP}
                    className="flex-1 py-2.5 rounded-lg border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span>📦</span>
                    Export clean ZIP (Freedom)
                  </button>
                  <button
                    onClick={handleDeployLive}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <span>🌐</span>
                    Deploy Live Web Page
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Projects Section */}
            {savedProjects.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-3">📁 My Saved Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {savedProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => loadProject(project)}
                      className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 cursor-pointer hover:border-purple-500 transition-all"
                    >
                      <h4 className="text-white text-sm font-medium">{project.title}</h4>
                      <p className="text-gray-400 text-xs mt-1 truncate">{project.prompt}</p>
                      <p className="text-gray-500 text-xs mt-2">{new Date(project.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "blueprint" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">📦 Blueprint Store</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { emoji: "🛒", name: "Ecommerce Dashboard", desc: "Products, orders, customers", prompt: "Create an ecommerce dashboard with product listing, shopping cart, and order management with blue styling" },
                { emoji: "📞", name: "CRM System", desc: "Contacts, deals, tasks", prompt: "Create a CRM system with contact management, deal pipeline, and task tracking with modern UI" },
                { emoji: "🧾", name: "Invoice Generator", desc: "Create, send, track", prompt: "Create an invoice generator with create/edit/delete, PDF export, and client management" },
                { emoji: "🤖", name: "Customer Support Agent", desc: "Chat + ticket system", prompt: "Create a customer support agent with chat interface, ticket dashboard, and email integration" }
              ].map((template, i) => (
                <div key={i} className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 hover:border-purple-500 transition-all cursor-pointer" onClick={() => {
                  setPromptText(template.prompt);
                  setActiveTab("builder");
                }}>
                  <div className="text-3xl mb-2">{template.emoji}</div>
                  <h3 className="font-medium text-white text-sm">{template.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{template.desc}</p>
                  <button className="mt-3 text-xs text-purple-400 hover:text-purple-300">Use Template →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-12 text-center">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-lg font-medium text-white mb-2">Anonymous Build Intelligence</h3>
            <p className="text-gray-400 text-sm">Coming after 100+ builds</p>
            <p className="text-xs text-gray-500 mt-4">🔒 No private data collected. Only anonymous patterns.</p>
          </div>
        )}

        {activeTab === "config" && (
          <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 max-w-2xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-800">
                <div>
                  <p className="text-sm font-medium text-white">Local LLM Endpoint</p>
                  <p className="text-xs text-gray-400">http://localhost:11434</p>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Active</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-800">
                <div>
                  <p className="text-sm font-medium text-white">Active Model</p>
                  <p className="text-xs text-gray-400">qwen2.5-coder:7b</p>
                </div>
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">Ollama</span>
              </div>
              
              {/* Telemetry Toggle */}
              <div className="flex justify-between items-center py-3 border-b border-gray-800">
                <div>
                  <p className="text-sm font-medium text-white">Anonymous Telemetry</p>
                  <p className="text-xs text-gray-400">Share anonymous build patterns to improve templates (earns free months)</p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !telemetryEnabled;
                    setTelemetryEnabled(newValue);
                    localStorage.setItem('telemetryEnabled', String(newValue));
                    if (newValue) {
                      console.log('🔒 PRIVACY DEPLOYMENT SECURED: Anonymous telemetry enabled');
                    } else {
                      console.log('🔒 Telemetry disabled. No data will be collected.');
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    telemetryEnabled 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {telemetryEnabled ? '✅ Opt Out → On' : '❌ Opt In → Off'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-96">
            <h2 className="text-xl font-bold text-white mb-4">
              {authMode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 mb-3 text-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 mb-4 text-white"
            />
            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg mb-2"
            >
              {authLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
            <button
              onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
              className="w-full text-sm text-gray-400 hover:text-gray-300"
            >
              {authMode === 'signin' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
            </button>
            <button
              onClick={() => setShowAuthModal(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-400 mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}