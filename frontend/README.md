# Yapper Frontend

A modern React frontend for generating viral shorts from YouTube videos.

## Features

- **Multi-step Process**: URL submission → Highlight selection → Video generation
- **Real-time Status**: Server-Sent Events for live generation progress
- **Modern UI**: Built with ShadCN UI components and Tailwind CSS
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development
- **Tailwind CSS v4** for styling
- **ShadCN UI** for components
- **Lucide React** for icons
- **Server-Sent Events** for real-time updates

## Getting Started

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Start development server:**

   ```bash
   pnpm run dev
   ```

3. **Make sure the FastAPI backend is running on `http://localhost:8000`**

## API Endpoints Used

- `POST /highlights` - Extract highlights from YouTube video
- `POST /generate` - Start video generation job
- `GET /generate/{job_id}/stream` - Stream generation status via SSE

## Component Structure

```
src/
├── components/
│   ├── URLSubmitForm.tsx      # Step 1: YouTube URL input
│   ├── HighlightsSelector.tsx # Step 2: Select highlights
│   ├── JobStatusStream.tsx    # Step 3: Monitor generation
│   ├── StepContainer.tsx      # Main container with state
│   └── ui/                    # ShadCN UI components
├── lib/
│   ├── api.ts                 # API utilities
│   └── types.ts              # TypeScript types
└── App.tsx                    # Root component
```

## Usage Flow

1. **Submit YouTube URL** with language preferences
2. **Select highlights** from extracted segments
3. **Monitor generation** with real-time progress updates
4. **Download generated videos** when complete

## Development

- The frontend expects the backend API at `http://localhost:8001`
- Path aliases are configured but use relative imports due to TypeScript config
- Components are fully typed with TypeScript
- Tailwind CSS v4 is used for styling
