FROM node:20-bookworm-slim

# Ensure Prisma CLI downloads the engine compatible with Debian + OpenSSL 3.
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x

WORKDIR /app

# pdf-poppler requires poppler binaries at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    poppler-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
