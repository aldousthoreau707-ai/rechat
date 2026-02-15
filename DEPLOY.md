# How to share ReChat with someone (deploy and send a link)

Deploy the app so you get a **single URL** you can send. Anyone who opens it can use ReChat (they’ll use your Groq key’s free tier).

## Option A: Deploy with Vercel (recommended, free)

1. **Create a Vercel account**  
   Go to [vercel.com](https://vercel.com) and sign up (GitHub is easiest).

2. **Push your project to GitHub** (if you haven’t already)
   ```bash
   cd "/home/aldous/Downloads/Cursor Rechat"
   git init
   git add .
   git commit -m "ReChat app"
   ```
   Create a new repo on [github.com](https://github.com/new), then:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/rechat.git
   git branch -M main
   git push -u origin main
   ```
   (Don’t commit `.env` – it’s in `.gitignore`.)

3. **Import the repo on Vercel**
   - Vercel → **Add New** → **Project**
   - Import your GitHub repo
   - **Environment Variables**: add  
     **Name:** `VITE_GROQ_API_KEY`  
     **Value:** your Groq key (same as in `.env`)
   - Deploy.

4. **Share the link**  
   Vercel gives you a URL like `https://rechat-xxx.vercel.app`. Send that; no install, no setup for them.

---

## Option B: Deploy with Netlify (free)

1. Sign up at [netlify.com](https://netlify.com).

2. **Build command:** `npm run build`  
   **Publish directory:** `dist`

3. In **Site settings → Environment variables**, add:
   - **Key:** `VITE_GROQ_API_KEY`
   - **Value:** your Groq API key

4. Deploy (drag-and-drop the `dist` folder or connect the same GitHub repo). Share the Netlify URL.

---

## Option C: Send the folder (they run it locally)

If you’d rather not use a host:

1. Zip the project folder **but remove `.env`** (so your key isn’t in the zip).
2. Send the zip.
3. They: unzip → run `npm install` → create a `.env` with their own `VITE_GROQ_API_KEY` → run `npm run dev` and open http://localhost:5173.

They need Node.js installed. For “just open a link,” use Option A or B.
