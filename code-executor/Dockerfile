FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    bash \
    ca-certificates \
    curl \
    docker.io \
    gcc \
    g++ \
    nodejs \
    npm \
    openjdk-17-jdk \
    python3 \
    python3-pip \
    time \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 sandbox

WORKDIR /app

COPY code-executor/package.json ./package.json
RUN npm install --omit=dev

COPY code-executor/server.js ./server.js
COPY code-executor/lib ./lib
COPY shared /shared

EXPOSE 8080

CMD ["node", "server.js"]
