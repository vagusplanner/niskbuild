import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface HealingAttempt {
  attempt: number;
  code: string;
  errors: string[];
  reflection: string;
}

// Validate code for common errors
function validateCode(code: string): string[] {
  const errors: string[] = [];
  
  if (!code.includes('<!DOCTYPE') && !code.includes('<html')) {
    errors.push('Missing HTML structure');
  }
  
  if (code.includes('undefined') && !code.includes('typeof')) {
    errors.push('Contains potentially undefined variables');
  }
  
  if (code.includes('null') && code.includes('.') && !code.includes('if')) {
    errors.push('Possible null reference error');
  }
  
  if (code.includes('fetch(') && !code.includes('.catch')) {
    errors.push('Fetch without error handling');
  }
  
  if (code.includes('document.getElementById') && !code.includes('if (element)')) {
    errors.push('DOM element not checked for existence');
  }
  
  return errors;
}

// Extract console errors from code
function findConsoleErrors(code: string): string[] {
  const errors: string[] = [];
  const consoleErrorPattern = /console\.error\(['"`](.*?)['"`]\)/g;
  let match;
  while ((match = consoleErrorPattern.exec(code)) !== null) {
    errors.push(match[1]);
  }
  return errors;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, previousAttempts = [] } = await request.json();
    const maxAttempts = 5;
    const attempts: HealingAttempt[] = [...previousAttempts];
    
    for (let attempt = attempts.length + 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Self-healing attempt ${attempt}/${maxAttempts}`);
      
      // Build context-aware prompt
      let contextPrompt = prompt;
      if (attempts.length > 0) {
        const lastAttempt = attempts[attempts.length - 1];
        contextPrompt = `
Previous attempt failed.
Original request: ${prompt}
Errors detected: ${lastAttempt.errors.join(', ')}
Reflection: ${lastAttempt.reflection}

Please generate FIXED code addressing these issues.
IMPORTANT: Output ONLY valid HTML/CSS/JavaScript code. Start with <!DOCTYPE html>.
        `;
      } else {
        contextPrompt = `
Generate a complete, working HTML/CSS/JavaScript application.
Request: ${prompt}
IMPORTANT: 
- Start with <!DOCTYPE html>
- Include error handling
- Check for null/undefined
- Make it interactive and functional
- Output ONLY code, no explanations
        `;
      }
      
      // Generate code using Groq (or local fallback)
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'You are an expert web developer. Generate clean, error-free code.' },
          { role: 'user', content: contextPrompt },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 4096,
      });
      
      let code = completion.choices[0]?.message?.content || '';
      
      // Clean markdown if present
      code = code.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      if (!code.startsWith('<!DOCTYPE')) {
        code = `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>NiskBuild App</title><style>body{font-family:system-ui;background:#0B0F19;color:#e2e8f0;padding:2rem;}</style></head><body>\n${code}\n</body>\n</html>`;
      }
      
      // Validate the code
      const errors = [...validateCode(code), ...findConsoleErrors(code)];
      
      if (errors.length === 0) {
        console.log(`✅ Self-healing succeeded on attempt ${attempt}`);
        return NextResponse.json({
          success: true,
          code,
          attempts: attempts.length + 1,
          message: `Generated successfully after ${attempt} attempt(s)`,
        });
      }
      
      // Reflect on errors for next attempt
      const reflectionRes = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Analyze the errors and explain how to fix them concisely.' },
          { role: 'user', content: `Code had these errors: ${errors.join(', ')}\n\nExplain what went wrong and how to fix it.` },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 500,
      });
      
      const reflection = reflectionRes.choices[0]?.message?.content || 'Fix errors';
      attempts.push({ attempt, code, errors, reflection });
    }
    
    // Return best attempt even if not perfect
    const bestAttempt = attempts.reduce((best, current) => 
      current.errors.length < best.errors.length ? current : best, attempts[0]);
    
    return NextResponse.json({
      success: false,
      code: bestAttempt.code,
      attempts: attempts.length,
      message: `Max attempts reached. Last attempt returned with ${bestAttempt.errors.length} issues.`,
      errors: bestAttempt.errors,
    });
    
  } catch (error) {
    console.error('Self-heal error:', error);
    return NextResponse.json(
      { error: 'Self-healing failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}