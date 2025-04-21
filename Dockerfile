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
# RUN apk add --no-cache imagemagick libjpeg-turbo-dev libpng-dev libreoffice openjdk17-jre-headless
# RUN apk add imagemagick 
# RUN apk add libjpeg-turbo-dev
# RUN apk add libpng-dev
# RUN apk add libreoffice
# RUN apk add openjdk17-jre-headless
# RUN apk add ttf-dejavu
# RUN apk add fontconfig
RUN npm install
RUN npm install -g @nestjs/cli
RUN npm install ts-node
COPY . .
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate
# RUN npm run test
CMD ["npm", "run", "start:devtsnd"]

# Production stage
FROM base AS production
# RUN apk add imagemagick 
# RUN apk add libjpeg-turbo-dev
# RUN apk add libpng-dev
# RUN apk add libreoffice
# RUN apk add openjdk17-jre-headless
# RUN apk add ttf-dejavu
# RUN apk add fontconfig

# RUN apk add --no-cache libreoffice libreoffice-calc libreoffice-writer libreoffice-impress
# RUN apk add --no-cache msttcorefonts-installer fontconfig

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

# docker compose up development


# For development
# docker build --target development -t dropbucket_nestjs:dev .

# For production 
# docker build --target production -t daruiza/dropbucket_nestjs:aws .
# docker push daruiza/dropbucket_nestjs:aws

# Comando de reparación ante nuevas dependencias
# rm -r node_modules && rm package-lock.json && npm install --force
# docker compose down -v && docker compose up --build