import { NextRequest, NextResponse } from 'next/server';

// Template database with 12+ premium templates
const templates = [
  // Existing templates
  {
    id: '1',
    name: 'Ecommerce Dashboard',
    description: 'Complete ecommerce dashboard with product management, cart, and order tracking',
    prompt: 'Create an ecommerce dashboard with product listing, shopping cart, order management, and sales charts. Use blue styling with Tailwind CSS.',
    price: 0,
    downloads: 1250,
    author: 'NiskBuild',
    category: 'ecommerce',
    featured: true,
    createdAt: '2026-01-15',
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
    featured: true,
    createdAt: '2026-01-20',
  },
  {
    id: '3',
    name: 'AI Chatbot',
    description: 'Customer support chatbot with message history and smart responses',
    prompt: 'Create a customer support chatbot with message history, typing indicators, and predefined responses. Use a clean, modern design.',
    price: 5,
    downloads: 234,
    author: 'AI Labs',
    category: 'ai',
    featured: false,
    createdAt: '2026-02-01',
  },
  {
    id: '4',
    name: 'Invoice Generator',
    description: 'Professional invoice system with PDF export and client management',
    prompt: 'Create an invoice generator with client management, line items, tax calculation, and PDF export. Use professional styling.',
    price: 10,
    downloads: 567,
    author: 'Finance Pro',
    category: 'finance',
    featured: false,
    createdAt: '2026-01-25',
  },
  {
    id: '5',
    name: 'Task Manager',
    description: 'Project management with kanban board, due dates, and team assignments',
    prompt: 'Create a task management app with drag-and-drop kanban board, due dates, priority levels, and team assignments. Use Tailwind CSS.',
    price: 0,
    downloads: 342,
    author: 'NiskBuild',
    category: 'productivity',
    featured: true,
    createdAt: '2026-02-10',
  },
  {
    id: '6',
    name: 'Analytics Dashboard',
    description: 'Real-time analytics with charts, metrics, and data visualization',
    prompt: 'Create an analytics dashboard with sales charts, user metrics, real-time data visualization, and export options. Use Chart.js for graphs.',
    price: 15,
    downloads: 89,
    author: 'Data Pro',
    category: 'analytics',
    featured: false,
    createdAt: '2026-02-15',
  },
  // NEW PREMIUM TEMPLATES
  {
    id: '7',
    name: 'AI Content Generator',
    description: 'Generate blog posts, social media content, and SEO metadata with AI',
    prompt: 'Create an AI content generator with OpenAI-style integration, markdown editor, SEO analysis, and export to PDF/Word. Use modern UI with purple accents.',
    price: 15,
    downloads: 234,
    author: 'AI Labs',
    category: 'ai',
    featured: false,
    createdAt: '2026-03-01',
  },
  {
    id: '8',
    name: 'Project Management Tool',
    description: 'Complete project management with kanban board, Gantt charts, and team chat',
    prompt: 'Create a project management tool with drag-and-drop kanban board, Gantt chart view, task assignments, due dates, file attachments, and team comments section.',
    price: 0,
    downloads: 567,
    author: 'NiskBuild',
    category: 'productivity',
    featured: true,
    createdAt: '2026-03-05',
  },
  {
    id: '9',
    name: 'Social Media Dashboard',
    description: 'Schedule posts, track analytics across Twitter, LinkedIn, Instagram',
    prompt: 'Create a social media dashboard with post scheduling calendar, analytics charts, engagement metrics, and multi-platform connections (Twitter, LinkedIn, Instagram mock).',
    price: 20,
    downloads: 123,
    author: 'Social Pro',
    category: 'analytics',
    featured: false,
    createdAt: '2026-03-10',
  },
  {
    id: '10',
    name: 'Real Estate Platform',
    description: 'Property listings, agent profiles, virtual tours, mortgage calculator',
    prompt: 'Create a real estate platform with property cards, advanced search/filter, agent profiles, contact forms, mortgage calculator, and Google Maps integration placeholder.',
    price: 25,
    downloads: 89,
    author: 'Realty Hub',
    category: 'ecommerce',
    featured: false,
    createdAt: '2026-03-15',
  },
  {
    id: '11',
    name: 'Food Delivery App',
    description: 'Restaurant listings, menu items, cart, order tracking, reviews',
    prompt: 'Create a food delivery app with restaurant cards, menu items with prices, shopping cart, order status tracking, customer reviews, and delivery address form.',
    price: 15,
    downloads: 312,
    author: 'FoodTech',
    category: 'ecommerce',
    featured: false,
    createdAt: '2026-03-20',
  },
  {
    id: '12',
    name: 'Healthcare Portal',
    description: 'Appointment booking, patient records, telemedicine, prescription refills',
    prompt: 'Create a healthcare portal with appointment booking calendar, patient dashboard, doctor profiles, telemedicine video call placeholder, prescription refill requests, and secure messaging.',
    price: 30,
    downloads: 67,
    author: 'HealthSoft',
    category: 'healthcare',
    featured: false,
    createdAt: '2026-03-25',
  },
  {
    id: '13',
    name: 'Online Learning Platform',
    description: 'Course management, video lessons, quizzes, certificates, student progress',
    prompt: 'Create an online learning platform with course catalog, video lesson player, quiz system with grading, certificate generation, student progress tracking, and instructor dashboard.',
    price: 25,
    downloads: 156,
    author: 'EduTech',
    category: 'education',
    featured: false,
    createdAt: '2026-04-01',
  },
  {
    id: '14',
    name: 'Event Management System',
    description: 'Event creation, ticket sales, attendee tracking, QR check-in',
    prompt: 'Create an event management system with event creation form, ticket tiers, payment mockup, attendee list, QR code check-in scanner simulation, and email notifications.',
    price: 20,
    downloads: 98,
    author: 'EventPro',
    category: 'events',
    featured: false,
    createdAt: '2026-04-05',
  },
  {
    id: '15',
    name: 'Recruitment Platform',
    description: 'Job listings, application tracking, resume parser, candidate scoring',
    prompt: 'Create a recruitment platform with job posting board, application submission form, candidate tracking pipeline, resume preview, skill scoring, and interview scheduling calendar.',
    price: 25,
    downloads: 112,
    author: 'HireFlow',
    category: 'hr',
    featured: false,
    createdAt: '2026-04-10',
  },
  {
    id: '16',
    name: 'Inventory Management System',
    description: 'Stock tracking, low stock alerts, supplier management, barcode scanner',
    prompt: 'Create an inventory management system with product catalog, stock level tracking, low stock alerts, supplier profiles, purchase orders, and barcode scanner simulation.',
    price: 20,
    downloads: 78,
    author: 'StockMaster',
    category: 'business',
    featured: false,
    createdAt: '2026-04-15',
  },
  {
    id: '17',
    name: 'Fitness Tracker',
    description: 'Workout logging, progress charts, meal planning, step counter',
    prompt: 'Create a fitness tracker app with workout logging (cardio, strength), progress charts (weight, reps), meal planning calendar, step counter integration, and achievement badges.',
    price: 10,
    downloads: 234,
    author: 'FitTech',
    category: 'health',
    featured: false,
    createdAt: '2026-04-20',
  },
  {
    id: '18',
    name: 'Hotel Booking System',
    description: 'Room search, availability calendar, booking management, reviews',
    prompt: 'Create a hotel booking system with room search filters, availability calendar, room details with photos, booking form, confirmation page, and guest review section.',
    price: 25,
    downloads: 145,
    author: 'TravelSoft',
    category: 'travel',
    featured: false,
    createdAt: '2026-04-25',
  },
  {
    id: '19',
    name: 'Portfolio Builder',
    description: 'Creative portfolio with project gallery, client testimonials, contact form',
    prompt: 'Create a portfolio builder for creative professionals with project gallery (filterable), client testimonials carousel, about section with skills chart, and contact form with map.',
    price: 0,
    downloads: 890,
    author: 'NiskBuild',
    category: 'portfolio',
    featured: true,
    createdAt: '2026-05-01',
  },
  {
    id: '20',
    name: 'News Aggregator',
    description: 'RSS feeds, category filtering, save articles, dark mode',
    prompt: 'Create a news aggregator with RSS feed fetching (mock), category filtering, article cards with images, save for later feature, and dark/light mode toggle.',
    price: 5,
    downloads: 345,
    author: 'NewsHub',
    category: 'news',
    featured: false,
    createdAt: '2026-05-05',
  },
];

// Get all templates with optional filtering
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const featured = searchParams.get('featured');
  const limit = searchParams.get('limit');
  
  let filtered = [...templates];
  
  // Filter by category
  if (category && category !== 'all') {
    filtered = filtered.filter(t => t.category === category);
  }
  
  // Filter by featured
  if (featured === 'true') {
    filtered = filtered.filter(t => t.featured);
  }
  
  // Search by name or description
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
  
  // Apply limit if specified
  if (limit) {
    filtered = filtered.slice(0, parseInt(limit));
  }
  
  return NextResponse.json({ 
    templates: filtered,
    total: filtered.length,
    categories: [...new Set(templates.map(t => t.category))],
  });
}

// Get single template by ID
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    const template = templates.find(t => t.id === id);
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    
    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

// Get popular templates (for homepage)
export async function HEAD(request: NextRequest) {
  const popular = [...templates]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 6);
  
  return NextResponse.json({ popular });
}