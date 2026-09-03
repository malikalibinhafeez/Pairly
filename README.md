# Private Chat — Secure Two-Person Messaging

A simple, private, and secure real-time two-person chat application built with Next.js, Supabase, and Tailwind CSS. Inspired by WhatsApp's core messaging experience.

## Features

- **User Authentication** — Register, login, logout via Supabase Auth
- **Connection Codes** — Unique random codes to pair two users privately
- **Real-Time Messaging** — Text messages delivered instantly via Supabase Realtime
- **Photo & Video Sharing** — Send JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (max 10 MB)
- **Delete for Me** — Remove a message from your own view only
- **Delete for Everyone** — Unsend a message within 2 days (shows "This message was deleted")
- **Per-User Chat Deletion** — Delete your entire chat without affecting the other user
- **Row Level Security** — All data access enforced at the database level
- **Responsive Design** — Works on desktop and mobile
- **Vercel Compatible** — Deploys seamlessly to Vercel

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js (App Router) | Full-stack React framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| Supabase Auth | Authentication |
| Supabase PostgreSQL | Database with RLS |
| Supabase Realtime | Live message delivery |
| Supabase Storage | Private media file storage |
| Vercel | Deployment |

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Redirect to dashboard or login
│   ├── globals.css             # Global styles
│   ├── auth/
│   │   ├── actions.ts          # Login, register, logout server actions
│   │   ├── login/page.tsx      # Login page
│   │   └── register/page.tsx   # Register page
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard with connection code & chat management
│   │   └── actions.ts          # Connect, delete chat server actions
│   ├── chat/
│   │   └── [chatId]/
│   │       ├── page.tsx        # Chat page (server component wrapper)
│   │       └── chat-client.tsx # Chat UI (client component with real-time)
│   └── api/
│       ├── messages/
│       │   ├── send/route.ts   # Send text message
│       │   ├── upload/route.ts # Upload media file
│       │   └── delete/route.ts # Delete/unsend message
│       └── media/
│           └── [messageId]/route.ts  # Secure media access (signed URLs)
├── components/
│   ├── message-bubble.tsx      # Message display component
│   └── file-upload.tsx         # File picker with validation
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server Supabase client
│       └── middleware.ts       # Session refresh middleware
├── middleware.ts               # Next.js route protection
├── supabase-schema.sql         # Complete database schema + RLS policies
└── .env.example                # Environment variables template
```

## Database Schema

### Tables

| Table | Purpose |
|---|---|
| `profiles` | User profiles (linked to Supabase Auth) |
| `chats` | Chat sessions between two users |
| `messages` | All messages (text, image, video) |
| `message_deletions` | Per-user message deletion tracking |

### Key Design Decisions

- **`chats.user1_id < user2_id`** constraint prevents duplicate chat entries
- **`user1_deleted_at` / `user2_deleted_at`** enables per-user chat deletion
- **`messages.deleted_for_everyone`** flag for unsend functionality
- **`message_deletions`** table for "delete for me" without modifying the original message
- **Media metadata only** in PostgreSQL — actual files in Supabase Storage

## Security Model

### Row Level Security (RLS)

Every table has RLS enabled with policies ensuring:
- Users can only read/write their own profile
- Users can only access chats they participate in
- Users can only send messages to their own chats
- Users can only unsend their own messages
- Storage access is restricted to chat participants

### Important Security Notes

- Supabase Auth handles password hashing — passwords are **never stored in plaintext**
- The `SUPABASE_SERVICE_ROLE_KEY` is **never exposed to the frontend**
- Media files are in a **private** Supabase Storage bucket — no public URLs
- All API routes verify authentication and authorization server-side
- File type and size validation happens both client-side and server-side

### ⚠️ No End-to-End Encryption

This application does **NOT** implement end-to-end encryption. Messages are stored in plaintext in the Supabase PostgreSQL database. The database owner/developer can technically access stored messages. This is similar to many messaging platforms but is explicitly disclosed here for transparency.

## Setup & Deployment

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Vercel](https://vercel.com) account (for deployment)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd private-chat
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **API Keys** from Settings → API

### 3. Configure Database

1. Go to the **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Run the SQL to create all tables, RLS policies, and storage configuration

### 4. Configure Authentication

1. Go to **Authentication** → **Settings** in Supabase
2. Ensure **Email** provider is enabled
3. For development: disable "Confirm email" to skip email verification
4. For production: configure your email provider (e.g., SMTP)

### 5. Create Private Storage Bucket

The SQL script creates the `chat-media` bucket automatically. If it doesn't:
1. Go to **Storage** in Supabase
2. Create a new bucket named `chat-media`
3. Set it to **Private** (not public)

### 6. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 7. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 8. Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add the environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### 9. Post-Deployment

1. Update your Supabase project's **URL Configuration** (Authentication → URL Configuration):
   - Site URL: `https://your-vercel-domain.vercel.app`
   - Redirect URLs: `https://your-vercel-domain.vercel.app/**`

## Usage Flow

1. **Register** — Create an account with username, email, password
2. **Get Code** — Your unique connection code appears on the dashboard
3. **Share Code** — Share your code with the person you want to chat with
4. **Connect** — They enter your code on their dashboard
5. **Chat** — Send text messages, photos, and videos in real time
6. **Delete** — Use "Delete for me" or "Delete for everyone" on any message
7. **Clean Up** — Delete the entire chat from your side if needed

## License

MIT
