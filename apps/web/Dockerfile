FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments
ARG NEXT_PUBLIC_BASE_API_URL
ARG NEXT_PUBLIC_RAG_API_URL
ARG NEXT_PUBLIC_USE_LANGSMITH_AUTH
ARG NEXT_PUBLIC_MCP_AUTH_REQUIRED
ARG NEXT_PUBLIC_GOOGLE_AUTH_DISABLED
ARG NEXT_PUBLIC_DEPLOYMENTS
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_MCP_SERVER_URL

# Build the application with environment variables set inline
RUN npm install -g pnpm && \
    NEXT_PUBLIC_BASE_API_URL="$NEXT_PUBLIC_BASE_API_URL" \
    NEXT_PUBLIC_RAG_API_URL="$NEXT_PUBLIC_RAG_API_URL" \
    NEXT_PUBLIC_USE_LANGSMITH_AUTH="$NEXT_PUBLIC_USE_LANGSMITH_AUTH" \
    NEXT_PUBLIC_MCP_AUTH_REQUIRED="$NEXT_PUBLIC_MCP_AUTH_REQUIRED" \
    NEXT_PUBLIC_GOOGLE_AUTH_DISABLED="$NEXT_PUBLIC_GOOGLE_AUTH_DISABLED" \
    NEXT_PUBLIC_DEPLOYMENTS="$NEXT_PUBLIC_DEPLOYMENTS" \
    NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    NEXT_PUBLIC_MCP_SERVER_URL="$NEXT_PUBLIC_MCP_SERVER_URL" \
    pnpm run build:internal

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create empty public directory (Next.js apps may not have one)
RUN mkdir -p ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD HOSTNAME="0.0.0.0" node server.js
