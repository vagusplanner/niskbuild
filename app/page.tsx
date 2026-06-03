"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import SubscriptionGuard from "@/app/components/SubscriptionGuard";
import ProjectLimitBadge from "@/app/components/ProjectLimitBadge";

type TabType = "builder" | "blueprint" | "insights" | "config";

// Define types for Supabase session
interface SupabaseSession {
  user: {
    id: string;
    email?: string;
  } | null;
}

interface SupabaseAuthResponse {
  data: {
    session: SupabaseSession | null;
  };
}

// Admin email - only this email will see the Admin Panel link
const ADMIN_EMAIL = "sofiane.kemih@gmail.com";

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
// NiskBuild now features:
// 🔄 Self-correction loop - AI fixes its own errors (up to 5 attempts)
// ☁️ Cloud AI fallback - Works even without Ollama
// 📊 Anonymous telemetry - Helps improve the platform
// 💳 Pro tier - Unlimited projects
// 🔒 License heartbeat - Active subscription required
// 
// Example: "Create a blue button that says Click Me"
`);

  const [promptText, setPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("<div style='padding:20px; color:#888; text-align:center;'>✨ Generate an app above, then click Live Preview to see it here!</div>");
  const [statusMessage, setStatusMessage] = useState("");

  // Metadata tracking state
  const [sessionPrompts, setSessionPrompts] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Check if Supabase is available
  const isSupabaseAvailable = () => {
    return supabase && typeof supabase === 'object' && supabase.auth;
  };

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

  // Helper to extract app category from prompt
  const extractAppCategory = (prompt: string): string => {
    const categories = ['ecommerce', 'crm', 'todo', 'calculator', 'dashboard', 'chat', 'form', 'landing', 'blog', 'portfolio', 'weather', 'counter'];
    for (const cat of categories) {
      if (prompt.toLowerCase().includes(cat)) {
        return cat;
      }
    }
    return 'other';
  };

  // Project Slot Caps Based on Subscription Tier
  const canCreateProject = async (userId: string): Promise<boolean> => {
    try {
      // Get user's subscription tier and status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return false;
      }
      
      const tier = profile?.subscription_tier || 'free';
      const isActive = profile?.subscription_status === 'active';
      
      // Count existing projects
      const { count, error: countError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (countError) {
        console.error('Project count error:', countError);
        return false;
      }
      
      const projectCount = count || 0;
      
      // Define project limits per tier
      const limits: Record<string, number> = {
        free: 1,
        pro: 3,
        agency: 15,
        scale: 999999,
        white_label: 999999,
      };
      
      const limit = limits[tier] || 1;
      const canCreate = projectCount < limit;
      
      if (!canCreate) {
        console.log(`⚠️ User ${userId} (${tier}) has ${projectCount}/${limit} projects - limit reached`);
      }
      
      return canCreate && isActive;
      
    } catch (error) {
      console.error('Error checking project limit:', error);
      return false;
    }
  };

  // Helper to log metadata to Supabase
  const logBuildMetadata = async (exported: boolean) => {
    if (!telemetryEnabled) return;
    
    const buildDuration = (Date.now() - sessionStartTime) / 1000 / 60;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await fetch('/api/log-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id || null,
          sessionId: session?.user?.id ? `${session.user.id}-${Date.now()}` : `anon-${Date.now()}`,
          appCategory: extractAppCategory(promptText),
          prompts: sessionPrompts,
          successCount: sessionPrompts.length,
          failCount: 0,
          buildDurationMinutes: Math.floor(buildDuration),
          exportedLocally: exported,
          subscriptionTier: 'free',
          locale: navigator.language,
          telemetryEnabled: telemetryEnabled,
        }),
      });
      
      console.log('📊 Metadata logged for:', exported ? 'export' : 'session end');
    } catch (error) {
      console.error('Failed to log metadata:', error);
    }
    
    setSessionPrompts([]);
    setSessionStartTime(Date.now());
  };

  // Helper function to clean markdown from AI responses
  const cleanGeneratedCode = (rawCode: string): string => {
    let cleaned = rawCode;
    
    const markdownMatch = cleaned.match(/```(?:html|html|javascript|jsx|tsx|typescript)?\n?([\s\S]*?)\n?```/i);
    if (markdownMatch) {
      cleaned = markdownMatch[1];
    }
    
    const doctypeMatch = cleaned.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
    if (doctypeMatch) {
      cleaned = doctypeMatch[1];
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
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 NiskBuild Generated App</h1>
    <div style="background: #1a1f2e; border-radius: 12px; padding: 2rem; margin-top: 1rem;">
      <h3>Generated Content:</h3>
      <pre style="background: #0B0F19; padding: 1rem; border-radius: 8px; overflow-x: auto; text-align: left;">${cleaned.substring(0, 500)}</pre>
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
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - skipping project load');
      return;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSavedProjects(data);
    }
  };

  // Save current project to Supabase with limit check
  const saveCurrentProject = async () => {
    if (!isSupabaseAvailable()) {
      alert("⚠️ Supabase is not configured. Please add environment variables.");
      return;
    }
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!generatedCode || generatedCode.includes("will appear here") || generatedCode.includes("NiskBuild AI is working")) {
      alert("⚠️ Please generate an app first before saving.");
      return;
    }

    const allowed = await canCreateProject(user.id);
    if (!allowed) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      
      const tier = profile?.subscription_tier || 'free';
      
      let upgradeMessage = "";
      if (tier === 'free') {
        upgradeMessage = "Free tier is limited to 1 project. Upgrade to Pro for 3 projects, or Scale for unlimited projects.";
      } else if (tier === 'pro') {
        upgradeMessage = "Pro tier is limited to 3 projects. Upgrade to Agency Studio for 15 projects, or Scale for unlimited projects.";
      } else if (tier === 'agency') {
        upgradeMessage = "Agency tier is limited to 15 projects. Upgrade to Scale for unlimited projects.";
      } else {
        upgradeMessage = "Project limit reached. Please upgrade your plan for more projects.";
      }
      
      const confirmUpgrade = confirm(
        `❌ Project limit reached.\n\n${upgradeMessage}\n\nWould you like to view our pricing plans?`
      );
      if (confirmUpgrade) {
        window.location.href = '/pricing';
      }
      return;
    }

    const title = prompt('Project name:', promptText.substring(0, 50) || 'Untitled Project');
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
      alert('✅ Project saved successfully!');
      loadProjects(user.id);
    }
  };

  // Delete a project
  const deleteProject = async (projectId: string, projectTitle: string) => {
    if (!confirm(`Delete "${projectTitle}"? This cannot be undone.`)) {
      return;
    }
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) {
      alert('Error deleting project: ' + error.message);
    } else {
      alert('✅ Project deleted');
      if (user) {
        loadProjects(user.id);
      }
    }
  };

  // Load a saved project
  const loadProject = (project: any) => {
    setPromptText(project.prompt);
    setGeneratedCode(project.generated_code);
    setPreviewHtml(cleanGeneratedCode(project.generated_code));
    setActiveTab("builder");
    setSessionPrompts([]);
    setSessionStartTime(Date.now());
  };

  // Authentication handlers
  const handleAuth = async () => {
    if (!isSupabaseAvailable()) {
      alert("⚠️ Supabase is not configured. Please contact support.");
      return;
    }
    
    setAuthLoading(true);
    
    try {
      const normalizedEmail = authEmail.trim().toLowerCase();
      const normalizedPassword = authPassword.trim();
      
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: normalizedPassword,
          options: {
            data: {
              full_name: normalizedEmail.split('@')[0],
            },
          },
        });
        
        if (error) {
          alert(error.message);
        } else if (data.user) {
          if (data.session) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('subscription_tier')
              .eq('id', data.user.id)
              .single();
            
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: normalizedEmail,
              subscription_tier: existingProfile?.subscription_tier || 'free',
              subscription_status: 'active',
              created_at: new Date().toISOString(),
            });
            alert("✅ Account created! You are now signed in.");
            setShowAuthModal(false);
            setUser(data.user);
            loadProjects(data.user.id);
          } else {
            alert("✅ Account created! Please check your email to confirm your account before signing in.");
            setShowAuthModal(false);
          }
          setAuthEmail('');
          setAuthPassword('');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            alert("❌ Invalid email or password. Please try again.");
          } else {
            alert(error.message);
          }
        } else if (data.user) {
          alert("✅ Signed in successfully!");
          setShowAuthModal(false);
          setAuthEmail('');
          setAuthPassword('');
          setUser(data.user);
          
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', data.user.id)
            .single();
          
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            subscription_tier: existingProfile?.subscription_tier || 'free',
            subscription_status: 'active',
            created_at: new Date().toISOString(),
          });
          loadProjects(data.user.id);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      alert("An error occurred during authentication. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseAvailable()) return;
    await supabase.auth.signOut();
    setUser(null);
    setSavedProjects([]);
  };

  // Check auth status on load
  useEffect(() => {
    if (!isSupabaseAvailable()) {
      console.warn('Supabase not available - auth disabled');
      return;
    }
    
    supabase.auth.getSession().then((response: SupabaseAuthResponse) => {
      const session = response.data.session;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProjects(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: SupabaseSession | null) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProjects(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      alert("Please enter a prompt first!");
      return;
    }
    
    const startTime = Date.now();
    setIsGenerating(true);
    
    setSessionPrompts(prev => [...prev, promptText]);
    
    setStatusMessage("🔄 Starting generation with self-correction loop...");
    setGeneratedCode("🔄 NiskBuild AI is working...\n\nAttempt 1: Generating initial code...\n");
    setPreviewHtml("<div style='padding:20px; color:#888; text-align:center;'>🔄 Generating with self-correction... Please wait.</div>");
    
    try {
      setStatusMessage("🔄 Attempt 1/5: Generating code with error detection...");
      
      const selfHealResponse = await fetch('/api/self-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });
      
      const selfHealData = await selfHealResponse.json();
      
      if (selfHealData.success) {
        const cleanedCode = cleanGeneratedCode(selfHealData.code);
        setGeneratedCode(cleanedCode);
        setPreviewHtml(cleanedCode);
        setStatusMessage(`✅ Success! Generated in ${selfHealData.attempts} attempt(s) with self-correction`);
        
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
            console.error('Failed to log structural data:', logError);
          }
        }
        
        setIsGenerating(false);
        return;
      }
      
      if (selfHealData.code) {
        setStatusMessage(`⚠️ Self-correction completed with ${selfHealData.errors?.length || 0} remaining issues. Displaying best attempt.`);
        const cleanedCode = cleanGeneratedCode(selfHealData.code);
        setGeneratedCode(cleanedCode);
        setPreviewHtml(cleanedCode);
        setIsGenerating(false);
        return;
      }
      
      setStatusMessage("☁️ Falling back to cloud AI generation...");
      
      const cloudResponse = await fetch('/api/cloud-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, useLocal: true }),
      });
      
      const cloudData = await cloudResponse.json();
      
      if (cloudData.success) {
        const cleanedCode = cleanGeneratedCode(cloudData.code);
        setGeneratedCode(cleanedCode);
        setPreviewHtml(cleanedCode);
        setStatusMessage(`✅ Generated via ${cloudData.source === 'local' ? 'Local Ollama' : 'Cloud AI'}`);
        
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
            console.error('Failed to log structural data:', logError);
          }
        }
      } else {
        throw new Error(cloudData.error || 'All generation methods failed');
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGeneratedCode(`❌ Generation failed after multiple attempts.

Error: ${errorMessage}

Possible solutions:
1. Check your internet connection
2. Try a simpler prompt
3. If using local Ollama, make sure it's running

Your prompt was: "${promptText.substring(0, 200)}"`);
      
      setPreviewHtml(`<div style="padding:20px; color:#ef4444; background:#1a1f2e; border-radius:8px; text-align:center;">
        <h3>❌ Generation Failed</h3>
        <p>${errorMessage}</p>
      </div>`);
      setStatusMessage(`❌ Generation failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        if (!isGenerating) {
          setStatusMessage("");
        }
      }, 5000);
    }
  };

  const handleExportZIP = async () => {
    if (!generatedCode || generatedCode.includes("will appear here") || generatedCode.includes("Error") || generatedCode.includes("NiskBuild AI is working")) {
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
      
      await logBuildMetadata(true);
      
      alert("✅ Export complete! Your code is now yours forever. No watermarks, no lock-in.");
    } catch (error) {
      console.error('Export error:', error);
      alert("❌ Export failed: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const handleDeployLive = () => {
    alert("🚀 Deploy Live feature coming soon!\n\nPro feature: One-click deploy to Vercel for $69/month.");
  };

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-[#0B0F19] text-gray-200">
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

            <div className="my-4 mx-6 h-px bg-gray-800"></div>

            <button
              onClick={() => window.location.href = '/marketplace'}
              className="w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 text-blue-400 hover:text-blue-300 hover:bg-gray-900/50"
            >
              <span className="text-xl">🏪</span>
              <span className="text-sm font-medium">Marketplace</span>
            </button>

            <button
              onClick={() => window.location.href = '/pricing'}
              className="w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 text-emerald-400 hover:text-emerald-300 hover:bg-gray-900/50"
            >
              <span className="text-xl">💳</span>
              <span className="text-sm font-medium">Pricing & Upgrade</span>
            </button>

            {/* Admin Panel Link - Only visible to admin email */}
            {user?.email === ADMIN_EMAIL && (
              <>
                <div className="my-4 mx-6 h-px bg-gray-800"></div>
                <button
                  onClick={() => window.location.href = '/admin/users'}
                  className="w-full text-left px-6 py-3 flex items-center gap-3 transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-gray-900/50"
                >
                  <span className="text-xl">👑</span>
                  <span className="text-sm font-medium">Admin Panel</span>
                </button>
              </>
            )}
          </nav>

          <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 text-center">
            <div>🔒 Fully Local · No Telemetry</div>
            <div className="mt-1">v0.1.0 · NiskBuild Core</div>
          </div>
        </aside>

        <main className="ml-64 mt-14 p-6 min-h-[calc(100vh-3.5rem)]">
          {activeTab === "builder" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">🏗️ Local Builder Workspace</h2>
                <div className="text-xs text-gray-500 font-mono">Self-Correction Loop Active</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-5 flex flex-col h-[calc(100vh-180px)]">
                  <label className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Prompt to Build
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Describe the application you want to build..."
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
                  {statusMessage && (
                    <div className="mt-3 text-xs text-center">
                      <span className="text-purple-400">{statusMessage}</span>
                    </div>
                  )}
                </div>

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

              {/* Saved Projects Section with Delete Button */}
              {savedProjects.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-300">📁 My Saved Projects</h3>
                    {user && (
                      <ProjectLimitBadge userId={user.id} currentCount={savedProjects.length} />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedProjects.map((project) => (
                      <div
                        key={project.id}
                        className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 cursor-pointer hover:border-purple-500 transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div 
                            className="flex-1"
                            onClick={() => loadProject(project)}
                          >
                            <h4 className="text-white text-sm font-medium">{project.title}</h4>
                            <p className="text-gray-400 text-xs mt-1 truncate">{project.prompt}</p>
                            <p className="text-gray-500 text-xs mt-2">{new Date(project.created_at).toLocaleDateString()}</p>
                          </div>
                          <button
                            onClick={() => deleteProject(project.id, project.title)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1"
                            aria-label="Delete project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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
                    setSessionPrompts([]);
                    setSessionStartTime(Date.now());
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
                    <p className="text-xs text-gray-400">qwen2.5-coder:7b + Groq + Together AI</p>
                  </div>
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">Hybrid</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-white">Self-Correction Loop</p>
                    <p className="text-xs text-gray-400">AI fixes its own errors (up to 5 attempts)</p>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Active</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-white">Cloud AI Fallback</p>
                    <p className="text-xs text-gray-400">Groq → Together AI → Fallback chain</p>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Ready</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-white">Project Limits</p>
                    <p className="text-xs text-gray-400">Free:1 | Pro:3 | Agency:15 | Scale:Unlimited</p>
                  </div>
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">Enforced</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-800">
                  <div>
                    <p className="text-sm font-medium text-white">License Heartbeat</p>
                    <p className="text-xs text-gray-400">Active subscription required every 60 minutes</p>
                  </div>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Active</span>
                </div>
                
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

        {showAuthModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-96 max-w-[90vw]">
              <h2 className="text-xl font-bold text-white mb-4">
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              
              <input
                type="email"
                placeholder="Email address"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              
              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              
              <button
                onClick={handleAuth}
                disabled={authLoading || !authEmail || !authPassword}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg mb-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
              </button>
              
              <button
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setAuthEmail('');
                  setAuthPassword('');
                }}
                className="w-full text-sm text-gray-400 hover:text-gray-300 text-center"
              >
                {authMode === 'signin' 
                  ? "Don't have an account? Sign Up" 
                  : "Already have an account? Sign In"}
              </button>
              
              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-400 text-center mt-3"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </SubscriptionGuard>
  );
}