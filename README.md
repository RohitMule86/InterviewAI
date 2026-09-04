# Placify

Placify is an AI-powered mock interview preparation app. Users can sign in, create a custom interview based on a job role, skills, and experience level, then receive AI-generated interview questions and answers.

## Features

- Secure authentication with Clerk
- Personalized mock interview creation
- AI-generated interview questions and answers using Google Gemini
- Interview details stored in Neon PostgreSQL
- Webcam enablement for a more realistic interview setup
- Responsive dashboard built with Next.js and Tailwind CSS

## Tech Stack

- **Framework:** Next.js 16, React 19
- **Styling:** Tailwind CSS, shadcn/ui, Base UI
- **Authentication:** Clerk
- **AI:** Google Generative AI (Gemini)
- **Database:** Neon PostgreSQL
- **ORM:** Drizzle ORM
- **Icons:** Lucide React

## How It Works

1. Sign in or create an account.
2. Open the dashboard and select **Add New**.
3. Enter the target job role, a short job description/tech stack, and years of experience.
4. Gemini generates a configurable number of interview questions and answers.
5. The generated interview is saved to PostgreSQL.
6. Open the interview page to review the role details and enable your webcam before starting.

## Project Structure

```text
Placify/
├── app/
│   ├── (auth)/                    # Clerk sign-in and sign-up pages
│   ├── dashboard/
│   │   ├── _components/            # Dashboard UI components
│   │   ├── interview/[interviewId] # Interview preparation page
│   │   ├── layout.jsx
│   │   └── page.jsx
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/ui/                 # Reusable UI primitives
├── lib/                           # Shared utilities
├── public/                        # Static assets
├── utils/
│   ├── db.js                      # Neon + Drizzle database client
│   ├── GeminiAIModel.js           # Gemini configuration
│   └── schema.js                  # Database schema
├── middleware.js                  # Protected-route middleware
├── drizzle.config.js
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- A [Clerk](https://clerk.com/) application
- A [Neon](https://neon.tech/) PostgreSQL database
- A [Google AI Studio](https://aistudio.google.com/) Gemini API key

### Installation

```bash
git clone https://github.com/<your-username>/Placify.git
cd Placify
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

NEXT_PUBLIC_DRIZZLE_DB_URL=your_neon_postgresql_connection_string
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT=5
NEXT_PUBLIC_INFORMATION=Enable your webcam and microphone before starting the interview.
```

> Never commit `.env.local` or any API keys to GitHub.

### Database Setup

The application uses Drizzle ORM with PostgreSQL. The `mockInterview` table schema is defined in `utils/schema.js`.

Use the configured Drizzle command to sync the schema:

```bash
npm run db:push
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Creates a production build |
| `npm run start` | Starts the production server |
| `npm run db:push` | Pushes the Drizzle schema to PostgreSQL |
| `npm run db:studio` | Opens Drizzle Studio |

## Current Scope

Placify currently supports interview generation, persistence, interview-detail display, and webcam setup. Features such as a complete question-by-question interview flow, voice recording, answer evaluation, and performance feedback can be added in future iterations.

## Contributing

Contributions, improvements, and feature suggestions are welcome. Please open an issue or submit a pull request.

## License

This project is intended for educational and portfolio purposes.
