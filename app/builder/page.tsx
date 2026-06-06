"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Layout from '@/app/components/Layout';

export default function BuilderPage() {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setGeneratedCode('Generating...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/cloud-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt,
          userId: session?.user?.id,
          useLocal: false 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeneratedCode(data.code);
        setPreviewHtml(data.code);
      } else {
        setGeneratedCode(`Error: ${data.error}`);
      }
    } catch (error) {
      setGeneratedCode('Failed to generate. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout showSidebar={true}>
      <div className="h-[calc(100vh-56px)] flex">
        {/* Left Sidebar - Project Files */}
        <div className="w-64 bg-[#111827] border-r border-gray-800 overflow-y-auto hidden md:block">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-medium text-gray-400">EXPLORER</h3>
          </div>
          <div className="p-2">
            <div className="text-gray-300 text-sm p-2 hover:bg-gray-800 rounded cursor-pointer">
              📄 index.html
            </div>
            <div className="text-gray-300 text-sm p-2 hover:bg-gray-800 rounded cursor-pointer">
              🎨 styles.css
            </div>
            <div className="text-gray-300 text-sm p-2 hover:bg-gray-800 rounded cursor-pointer">
              ⚡ script.js
            </div>
          </div>
        </div>

        {/* Main Area: Prompt + Code/Preview */}
        <div className="flex-1 flex flex-col">
          {/* Prompt Input Area */}
          <div className="border-b border-gray-800 p-4">
            <div className="flex gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the application you want to build..."
                className="flex-1 bg-[#0B0F19] border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#4F6EF7]"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="px-6 py-2 bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 h-fit"
              >
                {isGenerating ? 'Generating...' : 'Generate →'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ⌘ + Enter to generate
            </p>
          </div>

          {/* Code/Preview Toggle */}
          <div className="border-b border-gray-800 px-4">
            <div className="flex gap-4">
              <button
                onClick={() => setShowPreview(false)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${!showPreview ? 'text-[#4F6EF7] border-b-2 border-[#4F6EF7]' : 'text-gray-400 hover:text-gray-300'}`}
              >
                📄 Code
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${showPreview ? 'text-[#4F6EF7] border-b-2 border-[#4F6EF7]' : 'text-gray-400 hover:text-gray-300'}`}
              >
                👁️ Preview
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            {!showPreview ? (
              <pre className="p-4 text-sm font-mono text-gray-300 whitespace-pre-wrap">
                <code>{generatedCode || '// Your generated code will appear here...'}</code>
              </pre>
            ) : (
              <iframe
                srcDoc={previewHtml || '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#0B0F19;color:#888;">Generate an app to see preview</div>'}
                title="Preview"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}