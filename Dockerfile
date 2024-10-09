FROM node:22.7.0-alpine3.20
WORKDIR /app
COPY . .
EXPOSE 3000
RUN yarn install
RUN yarn build
CMD ["node","dist/main"]
