# Push to GitHub (then deploy on Vercel)

Your project is committed locally. Do these two steps:

## 1. Create the repo on GitHub

Click this link (it opens "New repository" with the name **rechat** pre-filled):

**https://github.com/new?name=rechat**

- Leave "Public" selected.
- **Do not** add a README, .gitignore, or license (you already have them).
- Click **Create repository**.

## 2. Push your code

In a terminal, run (replace `YOUR_GITHUB_USERNAME` with your actual username):

```bash
cd "/home/aldous/Downloads/Cursor Rechat"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/rechat.git
git push -u origin main
```

If GitHub asks for a password, use a **Personal Access Token** (Settings → Developer settings → Personal access tokens), not your account password.

---

## 3. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Click **Import** next to your **rechat** repo.
3. Under **Environment Variables**, add:
   - **Name:** `VITE_GROQ_API_KEY`
   - **Value:** (paste your Groq key from your `.env` file)
4. Click **Deploy**.
5. Share the URL Vercel gives you (e.g. `https://rechat-xxx.vercel.app`).

Done.
