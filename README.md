# Material Mover

Lightweight example project with:
- Frontend: simple HTML/CSS/JS (buyer, seller, admin interfaces)
- Backend: Node.js + Express + MongoDB + JWT
- Search integration: forwards a search query to an external webhook (your friend's vector embedding service), expects a list of product IDs and returns products

This repository is a scaffold to get you started locally and deploy to Vercel. It includes a serverless-compatible API and static frontend pages.

## Project structure

- `api/` - serverless-compatible Express entrypoint (used by Vercel or local node)
- `server/` - models, routes and helpers
- `public/` - frontend static files (index.html, login.html, seller.html, admin.html, css, js)
- `seed/seed.js` - seeds example products and users
- `.env.example` - environment variables

## Required env variables

- `MONGODB_URI` - your MongoDB connection string
- `JWT_SECRET` - JWT secret
- `SEARCH_WEBHOOK_URL` - the webhook URL your friend provides (service that accepts { query } and returns product ids)
- `PORT` - local port (optional)

## Install & run locally (PowerShell)

Open PowerShell in the project root and run the following commands:

1. Install dependencies

```powershell
npm install
```

2. Copy the example env file and edit the values in a text editor (set MONGODB_URI and SEARCH_WEBHOOK_URL)

```powershell
copy .env.example .env
```

3. Seed the database with example data

```powershell
npm run seed
```

4. Run the dev server (nodemon)

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

Seed creates sample accounts:
- buyer@example.com / password123
- seller@example.com / password123
- admin@example.com / password123

## How search works

1. Buyer (or logged-in user) types a query in the search box.
2. Frontend calls `POST /api/products/search` with `{ query }`.
3. Server forwards the query to `SEARCH_WEBHOOK_URL` (your friend's endpoint).
4. The webhook must return product ids either as an array or in `{ productIds: [...] }`.
5. Server fetches product documents from MongoDB and returns them to the frontend.

## Deploying to Vercel

You can deploy this repo to Vercel. Vercel will serve the `public/` folder as static files and `api/` as serverless functions.

Steps:

1. Push this repository to GitHub.
2. In Vercel dashboard, Import Project -> select GitHub repo.
3. Set environment variables in Vercel project settings: `MONGODB_URI`, `JWT_SECRET`, `SEARCH_WEBHOOK_URL`.
4. Deploy. Vercel will run serverless functions in `api/` and serve the frontend.

Notes on production:
- For long-running servers and workloads consider Render or Railway. Serverless functions have execution and cold-start limits.

## Next steps & suggestions

- Add file uploads for product images (Cloudinary/S3).
- Add pagination and better search UX.
- Add admin product/user management UI.
