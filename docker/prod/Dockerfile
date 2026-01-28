FROM node:22-slim AS builder
WORKDIR /app
COPY package.json ./
ENV NODE_ENV=development
RUN npm install
COPY . .
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_CREDENTIALS_KEY
ARG VITE_PROXY_BINANCE_AUTH
ARG VITE_PROXY_BLOFIN_AUTH
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_CREDENTIALS_KEY=$VITE_CREDENTIALS_KEY
ENV VITE_PROXY_BINANCE_AUTH=$VITE_PROXY_BINANCE_AUTH
ENV VITE_PROXY_BLOFIN_AUTH=$VITE_PROXY_BLOFIN_AUTH
RUN npx vite build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN echo 'server { listen 3001; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { expires 1y; add_header Cache-Control "public, immutable"; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
