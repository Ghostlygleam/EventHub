# ─── Build the static SPA ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite bakes VITE_API_URL into the bundle at build time, not runtime.
# Railway forwards same-named service variables as build args automatically.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build


# ─── Dev stage — used by docker-compose with `target: dev` ────────
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]


# ─── Production stage — default target, used by Railway ───────────
FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
# Railway injects $PORT; fall back to 3000 for local prod testing.
# -s flag = SPA mode (all routes fall through to index.html).
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
