FROM node:24-alpine

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apk add --no-cache \
    chromium \
    && rm -rf /var/cache/apk/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY . . 

CMD ["node", "app.js"] 



