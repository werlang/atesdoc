FROM node:24

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true 
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install
COPY . . 

CMD ["node", "app.js"] 



