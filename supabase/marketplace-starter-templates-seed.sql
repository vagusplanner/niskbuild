-- Seed the 15 NiskBuild starter marketplace templates (formerly in lib/marketplace-templates.ts)
-- Run in Supabase SQL Editor after firstparty-marketplace-layers-migration.sql
-- Safe to re-run: skips rows that already exist by legacyTemplateId

insert into marketplace.listings (
  title,
  description,
  price_cents,
  listing_type,
  is_active,
  app_source
)
select
  v.title,
  v.description,
  v.price_cents,
  'template'::marketplace.listing_type,
  true,
  v.app_source::jsonb
from (
  values
    ('Portfolio Builder', 'Single-page creative portfolio with project gallery and contact form — perfect first project.', 0, '{"layer":"firstparty","legacyTemplateId":"1","prompt":"Create a minimalist portfolio for a creative professional with a hero section, filterable project gallery (6 projects), about section with skills bars, and a contact form. Use dark theme with cyan accents and Tailwind CSS.","category":"portfolio","author":"NiskBuild","featured":true,"complexity":1,"downloads":2840}'),
    ('Waitlist Landing Page', 'Simple conversion-focused landing page with email capture and feature highlights.', 0, '{"layer":"firstparty","legacyTemplateId":"2","prompt":"Create a SaaS waitlist landing page with hero headline, 3 feature cards, email signup form, social proof counter, and footer. Clean dark UI with gradient CTA button.","category":"marketing","author":"NiskBuild","featured":true,"complexity":2,"downloads":1920}'),
    ('News Aggregator', 'RSS-style feed reader with categories, saved articles, and dark mode toggle.', 900, '{"layer":"firstparty","legacyTemplateId":"3","prompt":"Create a news aggregator with mock article cards, category filter tabs, save-for-later bookmarks, search bar, and dark/light mode toggle. Responsive grid layout.","category":"news","author":"NewsHub","featured":false,"complexity":3,"downloads":890}'),
    ('Invoice Generator', 'Professional invoicing with line items, tax calculation, and PDF-ready layout.', 900, '{"layer":"firstparty","legacyTemplateId":"4","prompt":"Create an invoice generator with client selector, line items table, tax and discount fields, live total calculation, and a print-ready invoice preview. Professional styling.","category":"finance","author":"Finance Pro","featured":false,"complexity":3,"downloads":756}'),
    ('Fitness Tracker', 'Workout logging, progress charts, and achievement badges for health apps.', 1200, '{"layer":"firstparty","legacyTemplateId":"5","prompt":"Create a fitness tracker with workout log form (cardio/strength), weekly progress chart, BMI calculator, meal log sidebar, and achievement badges. Modern green accent UI.","category":"health","author":"FitTech","featured":true,"complexity":4,"downloads":612}'),
    ('Task Manager', 'Kanban board with drag-and-drop columns, priorities, and due dates.', 1900, '{"layer":"firstparty","legacyTemplateId":"6","prompt":"Create a task management app with drag-and-drop kanban board (To Do, In Progress, Done), priority tags, due date picker, and task detail modal. Use Tailwind CSS.","category":"productivity","author":"NiskBuild","featured":true,"complexity":5,"downloads":1340}'),
    ('CRM System', 'Contact management, deal pipeline, and activity timeline for small teams.', 1900, '{"layer":"firstparty","legacyTemplateId":"7","prompt":"Create a CRM system with contact list, deal pipeline kanban, activity timeline, notes panel, and search/filter. Modern UI with purple accents.","category":"crm","author":"NiskBuild","featured":true,"complexity":5,"downloads":980}'),
    ('Ecommerce Dashboard', 'Product catalog, orders table, revenue charts, and inventory overview.', 2500, '{"layer":"firstparty","legacyTemplateId":"8","prompt":"Create an ecommerce admin dashboard with product listing, order management table, revenue line chart, low-stock alerts, and customer list. Blue professional theme.","category":"ecommerce","author":"NiskBuild","featured":true,"complexity":6,"downloads":1120}'),
    ('Food Delivery App', 'Restaurant listings, menu cart, order tracking, and customer reviews.', 2500, '{"layer":"firstparty","legacyTemplateId":"9","prompt":"Create a food delivery app with restaurant cards, menu with add-to-cart, checkout summary, order status tracker, and star reviews. Mobile-first design.","category":"ecommerce","author":"FoodTech","featured":false,"complexity":6,"downloads":445}'),
    ('Social Media Dashboard', 'Post scheduling, engagement analytics, and multi-platform metrics.', 2900, '{"layer":"firstparty","legacyTemplateId":"10","prompt":"Create a social media dashboard with post scheduling calendar, engagement charts, platform tabs (Twitter, LinkedIn, Instagram mock), and content performance table.","category":"analytics","author":"Social Pro","featured":false,"complexity":7,"downloads":334}'),
    ('Real Estate Platform', 'Property search, agent profiles, mortgage calculator, and lead forms.', 2900, '{"layer":"firstparty","legacyTemplateId":"11","prompt":"Create a real estate platform with property cards, advanced filters, agent profiles, mortgage calculator, map placeholder, and contact inquiry forms.","category":"realestate","author":"Realty Hub","featured":false,"complexity":7,"downloads":278}'),
    ('Event Management System', 'Event creation, ticket tiers, attendee list, and QR check-in simulation.', 3500, '{"layer":"firstparty","legacyTemplateId":"12","prompt":"Create an event management system with event creation wizard, ticket tier pricing, attendee dashboard, QR check-in mock scanner, and email notification settings.","category":"events","author":"EventPro","featured":false,"complexity":8,"downloads":198}'),
    ('Recruitment Platform', 'Job board, applicant pipeline, resume preview, and interview scheduling.', 3500, '{"layer":"firstparty","legacyTemplateId":"13","prompt":"Create a recruitment platform with job posting board, candidate pipeline stages, resume preview panel, skill scoring, and interview scheduling calendar.","category":"hr","author":"HireFlow","featured":false,"complexity":8,"downloads":167}'),
    ('Healthcare Portal', 'Appointment booking, patient records, prescriptions, and secure messaging.', 4200, '{"layer":"firstparty","legacyTemplateId":"14","prompt":"Create a healthcare portal with appointment booking calendar, patient dashboard, doctor profiles, prescription refill form, and secure messaging inbox.","category":"healthcare","author":"HealthSoft","featured":false,"complexity":9,"downloads":89}'),
    ('Online Learning Platform', 'Full LMS: course catalog, video lessons, quizzes, certificates, and instructor dashboard.', 4900, '{"layer":"firstparty","legacyTemplateId":"15","prompt":"Create an online learning platform with course catalog, video lesson player, quiz system with grading, certificate generator, student progress dashboard, and instructor analytics. Most comprehensive multi-module app.","category":"education","author":"EduTech","featured":true,"complexity":10,"downloads":156}')
) as v(title, description, price_cents, app_source)
where not exists (
  select 1
  from marketplace.listings l
  where l.app_source->>'legacyTemplateId' = v.app_source::jsonb->>'legacyTemplateId'
);
