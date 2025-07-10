FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
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

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create public directory if it doesn't exist
RUN mkdir -p ./public && chown nextjs:nodejs ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "start"]
