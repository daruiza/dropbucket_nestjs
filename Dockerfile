# Base stage for shared configurations
FROM node:22.7.0-alpine3.20 AS base
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm install
RUN npm install -g @nestjs/cli
COPY prisma/ ./prisma/
COPY . .
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate
CMD ["npm", "run", "start:devtsnd"]

# Production stage
FROM base AS production
COPY package*.json ./
RUN npm install --only=production
RUN npm install -g @nestjs/cli
COPY prisma/ ./prisma/
COPY . .
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate
RUN npm run build
CMD ["npm", "run", "start:prod"]

# Use build argument to select stage
FROM ${BUILD_MODE:-development}


# For development
# docker build --target development -t app:dev .

# For production
# docker build --target production -t app:prod .