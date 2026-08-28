# --- deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
# React 19 peer ranges in the antd ecosystem need legacy peer resolution.
RUN npm install --legacy-peer-deps

# --- builder ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No backend URL is baked in: only the server side calls the API (the browser goes through
# /api/ui/*), so API_BASE_URL stays a runtime setting and one image serves any environment.
RUN npm run build

# --- runner ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
