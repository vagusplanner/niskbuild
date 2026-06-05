import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Groq (primary for free/pro users)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Initialize Anthropic Claude (premium for Agency+ users)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Optional providers - only initialize if API keys exist
let openai: any = null;
let together: any = null;

// Only initialize OpenAI if API key exists
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Only initialize Together AI if API key exists
if (process.env.TOGETHER_API_KEY) {
  const OpenAI = require('openai');
  together = new OpenAI({
    apiKey: process.env.TOGETHER_API_KEY,
    baseURL: 'https://api.together.xyz/v1',
  });
}

export type AIProvider = 'groq' | 'anthropic' | 'openai' | 'together' | 'local';

export interface AIResponse {
  success: boolean;
  code: string;
  provider: AIProvider;
  error?: string;
}

// System prompt for code generation
const SYSTEM_PROMPT = `You are an expert web developer. Generate ONLY complete HTML/CSS/JavaScript code. 
No explanations. No markdown. Start directly with <!DOCTYPE html>. 
Make it responsive, modern, and visually appealing. Use Tailwind CSS when appropriate.`;

// Generate with Groq (fast, cheap)
async function generateWithGroq(prompt: string): Promise<AIResponse> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
    });
    
    const code = completion.choices[0]?.message?.content || '';
    return { success: true, code, provider: 'groq' };
  } catch (error: any) {
    console.error('Groq error:', error.message);
    return { success: false, code: '', provider: 'groq', error: error.message };
  }
}

// Generate with Anthropic Claude (premium, high quality)
async function generateWithAnthropic(prompt: string): Promise<AIResponse> {
  // Check if API key exists
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, code: '', provider: 'anthropic', error: 'Anthropic API key not configured' };
  }
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229', // Best for coding tasks
      max_tokens: 4096,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const code = message.content[0].type === 'text' ? message.content[0].text : '';
    return { success: true, code, provider: 'anthropic' };
  } catch (error: any) {
    console.error('Anthropic Claude error:', error.message);
    return { success: false, code: '', provider: 'anthropic', error: error.message };
  }
}

// Generate with Together AI (backup)
async function generateWithTogether(prompt: string): Promise<AIResponse> {
  if (!together) {
    return { success: false, code: '', provider: 'together', error: 'Together AI not configured' };
  }
  
  try {
    const completion = await together.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      temperature: 0.7,
      max_tokens: 4096,
    });
    
    const code = completion.choices[0]?.message?.content || '';
    return { success: true, code, provider: 'together' };
  } catch (error: any) {
    console.error('Together AI error:', error.message);
    return { success: false, code: '', provider: 'together', error: error.message };
  }
}

// Generate with OpenAI GPT-4 (last resort)
async function generateWithOpenAI(prompt: string): Promise<AIResponse> {
  if (!openai) {
    return { success: false, code: '', provider: 'openai', error: 'OpenAI not configured' };
  }
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      max_tokens: 4096,
    });
    
    const code = completion.choices[0]?.message?.content || '';
    return { success: true, code, provider: 'openai' };
  } catch (error: any) {
    console.error('OpenAI error:', error.message);
    return { success: false, code: '', provider: 'openai', error: error.message };
  }
}

// Generate with Local Ollama (free, private)
async function generateWithLocal(prompt: string): Promise<AIResponse> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt: `${SYSTEM_PROMPT}\n\nUser request: ${prompt}`,
        stream: false,
        max_tokens: 4096,
      }),
    });
    
    if (!response.ok) throw new Error('Ollama not running');
    
    const data = await response.json();
    return { success: true, code: data.response, provider: 'local' };
  } catch (error: any) {
    console.error('Local Ollama error:', error.message);
    return { success: false, code: '', provider: 'local', error: error.message };
  }
}

// Tier-based provider ordering
export function getProviderOrder(tier: string): AIProvider[] {
  switch (tier) {
    case 'agency':
    case 'scale':
    case 'white_label':
      // Premium tiers: Claude first, then Groq, then Together, then local
      return ['anthropic', 'groq', 'together', 'local'];
    case 'pro':
      // Pro tier: Groq first, then Together, then local (no Claude)
      return ['groq', 'together', 'local'];
    default:
      // Free tier: Groq only, then local
      return ['groq', 'local'];
  }
}

// Main function - tries providers based on user tier
export async function generateCode(prompt: string, userTier: string = 'free'): Promise<AIResponse> {
  const providers = getProviderOrder(userTier);
  
  for (const provider of providers) {
    console.log(`🔄 [${userTier} tier] Trying ${provider}...`);
    
    let result: AIResponse;
    switch (provider) {
      case 'anthropic':
        result = await generateWithAnthropic(prompt);
        break;
      case 'groq':
        result = await generateWithGroq(prompt);
        break;
      case 'together':
        result = await generateWithTogether(prompt);
        break;
      case 'openai':
        result = await generateWithOpenAI(prompt);
        break;
      case 'local':
        result = await generateWithLocal(prompt);
        break;
      default:
        continue;
    }
    
    if (result.success) {
      console.log(`✅ [${userTier} tier] Success with ${provider}`);
      return result;
    }
  }
  
  return {
    success: false,
    code: '',
    provider: 'groq',
    error: 'All AI providers failed. Please try again later.',
  };
}

// Get status of all providers (for admin dashboard)
export async function getAIProviderStatus(): Promise<Record<AIProvider, boolean>> {
  const status = {
    groq: false,
    anthropic: false,
    openai: false,
    together: false,
    local: false,
  };
  
  // Test Groq
  try {
    await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 5,
    });
    status.groq = true;
  } catch (e) {}
  
  // Test Anthropic (if key exists)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'test' }],
      });
      status.anthropic = true;
    } catch (e) {}
  }
  
  // Test Together AI (if initialized)
  if (together) {
    try {
      await together.chat.completions.create({
        messages: [{ role: 'user', content: 'test' }],
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        max_tokens: 5,
      });
      status.together = true;
    } catch (e) {}
  }
  
  // Test Local Ollama
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    status.local = response.ok;
  } catch (e) {}
  
  return status;
}