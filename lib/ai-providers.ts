import Groq from 'groq-sdk';

// Initialize Groq (required)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Optional providers - only initialize if API key exists
let anthropic: any = null;
let openai: any = null;
let together: any = null;

// Only initialize Anthropic if API key exists
if (process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

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
Make it responsive, modern, and visually appealing.`;

// Generate with Groq
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

// Generate with Together AI (if available)
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

// Generate with Anthropic Claude (if available)
async function generateWithAnthropic(prompt: string): Promise<AIResponse> {
  if (!anthropic) {
    return { success: false, code: '', provider: 'anthropic', error: 'Anthropic not configured' };
  }
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const code = message.content[0].type === 'text' ? message.content[0].text : '';
    return { success: true, code, provider: 'anthropic' };
  } catch (error: any) {
    console.error('Anthropic error:', error.message);
    return { success: false, code: '', provider: 'anthropic', error: error.message };
  }
}

// Generate with Local Ollama (if available)
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

// Main function - tries providers in order until one works
export async function generateCode(prompt: string, preferLocal: boolean = false): Promise<AIResponse> {
  // Order: Groq → Together → Anthropic → Local
  const providers: AIProvider[] = ['groq', 'together', 'anthropic', 'local'];
  
  for (const provider of providers) {
    console.log(`🔄 Trying ${provider}...`);
    
    let result: AIResponse;
    switch (provider) {
      case 'groq':
        result = await generateWithGroq(prompt);
        break;
      case 'together':
        result = await generateWithTogether(prompt);
        break;
      case 'anthropic':
        result = await generateWithAnthropic(prompt);
        break;
      case 'local':
        result = await generateWithLocal(prompt);
        break;
      default:
        continue;
    }
    
    if (result.success) {
      console.log(`✅ Success with ${provider}`);
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