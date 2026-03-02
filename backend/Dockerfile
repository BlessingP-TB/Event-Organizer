FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache bash
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD [ "sh" , "-lc" , "npx prisma generate && node server.js" ]