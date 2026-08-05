# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Vite inlines VITE_* vars at build time, so they must be passed as build args.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_BASE_URL
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_GA_MEASUREMENT_ID
ARG VITE_CHATBOT_BASE_URL
# Deliberately left unset for this Dockerfile's builds (AKS/local Docker) —
# it must stay "true" only for the actual Vercel deployment (which builds via
# `npm run build` directly, not this Dockerfile, so it never even reaches
# here). See web/.env.example / src/main.tsx.
ARG VITE_ENABLE_VERCEL_ANALYTICS
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID \
    VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID \
    VITE_CHATBOT_BASE_URL=$VITE_CHATBOT_BASE_URL \
    VITE_ENABLE_VERCEL_ANALYTICS=$VITE_ENABLE_VERCEL_ANALYTICS

RUN npm run build

# --- Serve stage ---
FROM nginx:1.27-alpine AS serve
# .template + /etc/nginx/templates/ is the official nginx image's own
# envsubst-at-startup convention — resolves FLAGS_UPSTREAM from whatever
# container env var is set at `docker run`/deployment time (not baked in at
# build time), so the same image works locally and on AKS. Only variables
# that are actual environment variables get substituted, so nginx's own
# $uri/$host/etc. runtime variables are left untouched.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5174
CMD ["nginx", "-g", "daemon off;"]
