"use client";

import { useState, useEffect } from 'react';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';

interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  price: number;
  downloads: number;
  author: string;
  category: string;
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSafeSession();
      setUser(session?.user || null);
    };
    checkAuth();
    fetchTemplates();
  }, [category, search]);

  const fetchTemplates = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    
    const response = await fetch(`/api/marketplace?${params.toString()}`);
    const data = await response.json();
    setTemplates(data.templates || []);
    setLoading(false);
  };

  const useTemplate = (prompt: string) => {
    // Store in localStorage to use on builder page
    localStorage.setItem('niskbuild_template_prompt', prompt);
    window.location.href = '/builder';
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-white mb-4">
          🏪 Template Marketplace
        </h1>
        <p className="text-center text-gray-400 mb-12">
          Pre-built app templates from the community
        </p>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-nisk-card border border-nisk rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-nisk-card border border-nisk rounded-lg p-3 text-white focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All Categories</option>
            <option value="ecommerce">Ecommerce</option>
            <option value="crm">CRM</option>
            <option value="ai">AI / Chat</option>
            <option value="finance">Finance</option>
            <option value="productivity">Productivity</option>
          </select>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-xl mb-2">No templates found</p>
            <p className="text-sm">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-nisk-card rounded-xl border border-nisk p-6 hover:border-[var(--primary)] transition-all card-hover">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-white">{template.name}</h3>
                  {template.price > 0 ? (
                    <span className="text-purple-400 font-bold">${template.price}</span>
                  ) : (
                    <span className="text-emerald-400 text-sm">Free</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-4">{template.description}</p>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                  <span>👤 {template.author}</span>
                  <span>📥 {template.downloads} downloads</span>
                  <span className="capitalize">🏷️ {template.category}</span>
                </div>
                <button
                  onClick={() => useTemplate(template.prompt)}
                  className="w-full py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors"
                >
                  Use Template →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}