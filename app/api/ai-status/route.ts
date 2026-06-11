import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import 'server-only';
import OpenAI from 'openai';
import { getGroqClient } from '@/lib/groq-client';

// Initialize providers only if API keys exist (safe mode)
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
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Only initialize Together AI if API key exists
if (process.env.TOGETHER_API_KEY) {
  together = new OpenAI({
    apiKey: process.env.TOGETHER_API_KEY,
    baseURL: 'https://api.together.xyz/v1',
  });
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const status = {
    groq: false,
    anthropic: false,
    openai: false,
    together: false,
    local: false,
  };
  
  const groq = getGroqClient();
  if (groq) {
    try {
      await groq.chat.completions.create({
        messages: [{ role: 'user', content: 'test' }],
        model: 'llama-3.3-70b-versatile',
        max_tokens: 5,
      });
      status.groq = true;
    } catch (e) {
      console.log('Groq not available');
    }
  }
  
  // Test Anthropic (if initialized)
  if (anthropic) {
    try {
      await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'test' }],
      });
      status.anthropic = true;
    } catch (e) {
      console.log('Anthropic not available');
    }
  }
  
  // Test OpenAI (if initialized)
  if (openai) {
    try {
      await openai.chat.completions.create({
        messages: [{ role: 'user', content: 'test' }],
        model: 'gpt-4-turbo-preview',
        max_tokens: 5,
      });
      status.openai = true;
    } catch (e) {
      console.log('OpenAI not available');
    }
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
    } catch (e) {
      console.log('Together AI not available');
    }
  }
  
  // Test Local Ollama
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    status.local = response.ok;
  } catch (e) {
    console.log('Local Ollama not available');
  }
  
  return NextResponse.json(status);
}