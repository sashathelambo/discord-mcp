FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine

WORKDIR /app

# Install necessary packages for networking and stdio handling
RUN apk add --no-cache dumb-init

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY start.sh ./

# Make startup script executable
RUN chmod +x start.sh

ENV DISCORD_TOKEN=""
ENV DISCORD_GUILD_ID=""
ENV NODE_ENV=production

# Use dumb-init to handle signals properly for stdio transport
ENTRYPOINT ["dumb-init", "--"]
CMD ["./start.sh"]
