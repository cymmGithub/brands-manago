# Use Node.js 22 Alpine for minimal size
FROM node:22-alpine AS base

ARG NODE_ENV=development
ARG PORT=3000
ARG APP_HOST=localhost

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}
ENV APP_HOST=${APP_HOST}

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./

FROM base AS development
RUN npm ci && npm cache clean --force

COPY . .

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
CMD wget --no-verbose --tries=1 --spider http://${APP_HOST}:${PORT} || exit 1

CMD ["node", "server.js"]
