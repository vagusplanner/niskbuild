import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, useLocal = false } = await request.json();

    // If user wants local and has Ollama, try local first
    if (useLocal) {
      try {
        const localRes = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'qwen2.5-coder:7b',
            prompt: `Generate a complete HTML/CSS/JS app for: ${prompt}`,
            stream: false,
          }),
        });
        
        if (localRes.ok) {
          const data = await localRes.json();
          return NextResponse.json({ success: true, code: data.response, source: 'local' });
        }
      } catch (e) {
        console.log('Local Ollama not available, falling back to cloud');
      }
    }

    // Fallback to Groq cloud
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert web developer. Generate ONLY complete HTML/CSS/JavaScript code. No explanations. Start with <!DOCTYPE html>.',
        },
        {
          role: 'user',
          content: `Generate a complete working app: ${prompt}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4096,
    });

    const code = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ 
      success: true, 
      code: code,
      source: 'cloud',
      model: 'llama-3.3-70b'
    });
    
  } catch (error) {
    console.error('Cloud generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}