# Collaborative Task Management Platform

Hi! Here's a real-time task management application I built! It has offline-first architecture and drag-and-drop functionality.

![React](https://img.shields.io/badge/React-18.x-61dafb?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

## Features

- **Offline-First Architecture** - Works seamlessly without internet connection using IndexedDB
- **Real-Time Synchronization** - Updates sync across multiple clients in real-time
- **Drag-and-Drop Interface** - Intuitive task organization with smooth animations
- **Optimistic UI Updates** - Instant feedback before server confirmation
- **Undo/Redo Functionality** - Built-in state management for action history
- **Dark Theme** - Sleek, modern interface optimized for extended use

## Tech Stack

- **Frontend:** React 18, TypeScript
- **Backend:** Supabase (PostgreSQL)
- **State Management:** React Hooks, Custom state architecture
- **Drag & Drop:** @dnd-kit
- **Storage:** IndexedDB for offline persistence
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Installation
```bash
# Clone repository
git clone https://github.com/alejandro-ortiz3/task-platform.git
cd task-platform

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Add your Supabase URL and anon key to .env

# Run development server
npm run dev
```

### Environment Variables

Create a `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run this SQL in your Supabase SQL Editor:
```sql
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text not null default 'todo',
  position integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table tasks enable row level security;

create policy "Enable all access for all users" on tasks
  for all using (true);

create index tasks_status_position_idx on tasks(status, position);
```

## Architecture

### Offline-First Design
- All operations work immediately using IndexedDB
- Changes sync to Supabase when online
- Automatic conflict resolution

### State Management
- Custom React hooks for undo/redo
- Normalized state architecture
- History tracking for all mutations

### Real-Time Updates
- Polling mechanism for cross-client synchronization
- Optimistic updates for instant feedback
- Automatic retry on connection restore

## Key Learnings

- Implemented offline-first architecture with IndexedDB
- Built custom state management for undo/redo
- Designed optimistic UI update patterns
- Integrated Supabase for backend services
- Created smooth drag-and-drop interactions

**Made by me! (Alejandro Ortiz)**
- GitHub: [@alejandro-ortiz3](https://github.com/alejandro-ortiz3)
- LinkedIn: (https://linkedin.com/in/alejandroivanortiz)

---

Built with ❤️ using React, TypeScript, and D3.js