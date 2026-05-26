import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // The system prompt that forces actual HTML output
    const systemPrompt = `You are a code generator. Your ONLY job is to output working HTML/CSS/JavaScript code. 

CRITICAL RULES:
1. NEVER output file structures like "todo-list-app/├── index.html"
2. NEVER output folder trees or ASCII art
3. NEVER output markdown formatting or backticks
4. ALWAYS output raw HTML starting with <!DOCTYPE html>
5. ALWAYS include actual interactive elements (buttons, inputs, lists)
6. For a todo list, create ACTUAL HTML with input field, add button, and list

EXAMPLE CORRECT OUTPUT for "todo list":
<!DOCTYPE html>
<html>
<head><style>body{font-family:system-ui;padding:2rem;background:#0B0F19;color:white;}input,button{padding:8px 12px;margin:4px;}button{background:#3b82f6;color:white;border:none;border-radius:6px;}ul{list-style:none;padding:0;}li{background:#1a1f2e;margin:4px 0;padding:8px;border-radius:6px;}</style></head>
<body>
<h1>Todo List</h1>
<input type="text" id="todoInput" placeholder="Add a task...">
<button onclick="addTodo()">Add</button>
<ul id="todoList"></ul>
<script>function addTodo(){const input=document.getElementById('todoInput');const value=input.value.trim();if(value){const li=document.createElement('li');li.textContent=value;const del=document.createElement('button');del.textContent='Delete';del.onclick=function(){li.remove();};del.style.marginLeft='8px';li.appendChild(del);document.getElementById('todoList').appendChild(li);input.value='';}}</script>
</body>
</html>

Now generate ONLY the HTML code for this request. Start with <!DOCTYPE html> and end with </html>.`;

    const fullPrompt = systemPrompt + "\n\nUser request: " + prompt;

    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt: fullPrompt,
        stream: false,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama error: ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    
    return NextResponse.json({ 
      success: true, 
      code: data.response,
      model: 'qwen2.5-coder:7b',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate. Make sure Ollama is running (llama icon in menu bar).',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}