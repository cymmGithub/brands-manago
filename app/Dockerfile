# Use Node.js 22 Alpine for minimal size
FROM node:22-alpine AS base

ARG NODE_ENV=development
ARG PORT=3000
ARG APP_HOST=localhost
ARG BIND_HOST=0.0.0.0

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV APP_HOST=${APP_HOST}
ENV BIND_HOST=${BIND_HOST}

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./

FROM base AS development
RUN npm ci && npm cache clean --force

COPY . .

EXPOSE ${PORT}

CMD ["node", "server.js"]
