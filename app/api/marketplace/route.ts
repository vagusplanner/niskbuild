import { NextRequest, NextResponse } from 'next/server';

// Template database (you can move this to Supabase later)
const templates = [
  {
    id: '1',
    name: 'Ecommerce Dashboard',
    description: 'Complete ecommerce dashboard with product management, cart, and order tracking',
    prompt: 'Create an ecommerce dashboard with product listing, shopping cart, order management, and sales charts. Use blue styling with Tailwind CSS.',
    price: 0,
    downloads: 1250,
    author: 'NiskBuild',
    category: 'ecommerce',
  },
  {
    id: '2',
    name: 'CRM System',
    description: 'Customer relationship management with contacts, deals, and tasks',
    prompt: 'Create a CRM system with contact management, deal pipeline, task tracking, and customer notes. Use modern UI with purple accents.',
    price: 0,
    downloads: 890,
    author: 'NiskBuild',
    category: 'crm',
  },
  {
    id: '3',
    name: 'AI Chatbot',
    description: 'Customer support chatbot with message history',
    prompt: 'Create a customer support chatbot with message history, typing indicators, and predefined responses. Use a clean, modern design.',
    price: 5,
    downloads: 234,
    author: 'AI Labs',
    category: 'ai',
  },
  {
    id: '4',
    name: 'Invoice Generator',
    description: 'Professional invoice system with PDF export',
    prompt: 'Create an invoice generator with client management, line items, tax calculation, and PDF export. Use professional styling.',
    price: 10,
    downloads: 567,
    author: 'Finance Pro',
    category: 'finance',
  },
  {
    id: '5',
    name: 'Task Manager',
    description: 'Project management with kanban board',
    prompt: 'Create a task management app with drag-and-drop kanban board, due dates, and team assignments. Use Tailwind CSS.',
    price: 0,
    downloads: 342,
    author: 'NiskBuild',
    category: 'productivity',
  },
  {
    id: '6',
    name: 'Analytics Dashboard',
    description: 'Real-time analytics with charts and metrics',
    prompt: 'Create an analytics dashboard with sales charts, user metrics, and real-time data visualization. Use Chart.js for graphs.',
    price: 15,
    downloads: 89,
    author: 'Data Pro',
    category: 'ecommerce',
  },
];

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category');
  const search = request.nextUrl.searchParams.get('search');
  
  let filtered = [...templates];
  
  if (category && category !== 'all') {
    filtered = filtered.filter(t => t.category === category);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(searchLower) ||
      t.description.toLowerCase().includes(searchLower) ||
      t.category.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by downloads (most popular first)
  filtered.sort((a, b) => b.downloads - a.downloads);
  
  return NextResponse.json({ templates: filtered });
}