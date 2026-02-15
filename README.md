# ReChat

AI helps you communicate with compassion. Uses **Groq’s free tier** for all AI features.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Groq API key (free)**

   - Go to [console.groq.com](https://console.groq.com/) and sign up (no credit card).
   - Create an API key (API Keys in the console).
   - Copy `.env.example` to `.env` and set your key:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and set:
     ```
     VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxx
     ```

3. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:5173

## Usage

- **Create a room** → share the Room ID with the other person.
- **Join a room** → paste their Room ID and enter your name.
- Type a message and press **Enter** or click ✨ for AI rephrase suggestions (vulnerable / clear / connecting).
- Use the ⚡ menu: **Understand them**, **Help me respond**, **Get wisdom**, **I'm angry – help**.
- Click **Understand this** on their messages for tone, subtext, and response guidance.
