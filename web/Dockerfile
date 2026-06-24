# akk-portal web (Next.js, standalone). Railway собирает с root directory = web/.
# PORT передаёт Railway; NEXT_PUBLIC_API_BASE — build-time переменная (инлайнится
# в клиентский бандл), поэтому объявлена как ARG: Railway прокидывает свои
# variables в build args автоматически.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
# creditapp credit-backend — кредитный флоу идёт сюда (build-time, инлайнится в бандл).
ARG NEXT_PUBLIC_CREDIT_API_BASE
ENV NEXT_PUBLIC_CREDIT_API_BASE=$NEXT_PUBLIC_CREDIT_API_BASE
# eGov SSO — тоже build-time (инлайнятся в клиентский бандл). Railway прокидывает
# свои variables в build args автоматически, но каждую нужно объявить ARG здесь.
ARG NEXT_PUBLIC_EGOV_AUTHORIZE_URL
ENV NEXT_PUBLIC_EGOV_AUTHORIZE_URL=$NEXT_PUBLIC_EGOV_AUTHORIZE_URL
ARG NEXT_PUBLIC_EGOV_CLIENT_ID
ENV NEXT_PUBLIC_EGOV_CLIENT_ID=$NEXT_PUBLIC_EGOV_CLIENT_ID
ARG NEXT_PUBLIC_EGOV_REDIRECT_URI
ENV NEXT_PUBLIC_EGOV_REDIRECT_URI=$NEXT_PUBLIC_EGOV_REDIRECT_URI
ARG NEXT_PUBLIC_EGOV_SCOPE
ENV NEXT_PUBLIC_EGOV_SCOPE=$NEXT_PUBLIC_EGOV_SCOPE
ENV NEXT_TELEMETRY_DISABLED=1
# cache-bust: Railway иногда переиспользует кеш слоя `npm run build` даже при
# изменённых исходниках → build-time env/дефолты не инлайнятся. Меняй значение,
# чтобы гарантированно форсить свежую компиляцию.
ARG CACHE_BUST=20260624-2
RUN echo "cache-bust $CACHE_BUST" && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
