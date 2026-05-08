FROM node:20-alpine

ARG APP_VERSION=local
ARG BUILD_COMMIT=unknown

ENV APP_VERSION=${APP_VERSION}
ENV BUILD_COMMIT=${BUILD_COMMIT}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
