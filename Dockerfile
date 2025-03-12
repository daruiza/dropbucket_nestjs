# Base stage for shared configurations
FROM node:22.7.0-alpine3.20 AS base
EXPOSE 3031
WORKDIR /app
RUN apk add --no-cache openssl ca-certificates
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/

# Development stage
FROM base AS development
RUN npm install
RUN npm install -g @nestjs/cli
COPY . .
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate
# RUN npm run test
CMD ["npm", "run", "start:devtsnd"]

# Production stage
FROM base AS production
RUN npm install --only=production
RUN npm install -g @nestjs/cli
RUN npm install ts-node
COPY . .
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate
# RUN npm run test
RUN rm -rf test
RUN npm run build
CMD ["npm", "run", "start:prod"]
# CMD ["node", "dist/src/main.js"]

# Use build argument to select stage
# FROM ${BUILD_MODE:-development}


# For development
# docker build --target development -t dropbucket_nestjs:dev .

# For production
# docker build --target production -t dropbucket_nestjs:prod .
# docker build --target production -t daruiza/dropbucket_nestjs:aws .

# Tag
# docker image tag dropbucket_nestjs:prod dropbucket_nestjs:aws
# docker push daruiza/dropbucket_nestjs:aws