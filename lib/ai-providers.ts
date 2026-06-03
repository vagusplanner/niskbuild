import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Initialize providers
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AIProvider = 'groq' | 'anthropic' | 'openai' | 'local';

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

// Generate with Anthropic Claude
async function generateWithAnthropic(prompt: string): Promise<AIResponse> {
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

// Generate with OpenAI GPT-4
async function generateWithOpenAI(prompt: string): Promise<AIResponse> {
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
  const providers: AIProvider[] = preferLocal 
    ? ['local', 'groq', 'anthropic', 'openai']
    : ['groq', 'anthropic', 'openai', 'local'];
  
  for (const provider of providers) {
    console.log(`🔄 Trying ${provider}...`);
    
    let result: AIResponse;
    switch (provider) {
      case 'groq':
        result = await generateWithGroq(prompt);
        break;
      case 'anthropic':
        result = await generateWithAnthropic(prompt);
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

// Get status of all providers
export async function getAIProviderStatus(): Promise<Record<AIProvider, boolean>> {
  const status = {
    groq: false,
    anthropic: false,
    openai: false,
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
  
  // Test OpenAI (if key exists)
  if (process.env.OPENAI_API_KEY) {
    try {
      await openai.chat.completions.create({
        messages: [{ role: 'user', content: 'test' }],
        model: 'gpt-4-turbo-preview',
        max_tokens: 5,
      });
      status.openai = true;
    } catch (e) {}
  }
  
  // Test Local Ollama
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    status.local = response.ok;
  } catch (e) {}
  
  return status;
}