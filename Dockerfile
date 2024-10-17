FROM node:22.7.0-alpine3.20
WORKDIR /app
COPY . .
EXPOSE 3000
RUN npm install -g @nestjs/cli
RUN npm install
# RUN npm run build
# CMD ["node","dist/main"]
CMD ["npm","run","start:nodemon"]


# FROM node:22.7.0-alpine3.20
# RUN apk update && apk add --no-cache dump-init
# WORKDIR /app
# COPY . .
# EXPOSE 3000
# RUN yarn ci
# # RUN yarn ci --omit=dev #Producción
# RUN yarn build && \
#     yarn prune --production
# CMD ["dump-init","node","dist/main.js"]
