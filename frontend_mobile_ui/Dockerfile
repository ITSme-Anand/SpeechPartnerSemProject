FROM node:20-bullseye

WORKDIR /app

# Install dependencies first (separate layer) so Docker can cache this step
# and skip re-installing 500+ packages every time only source code changes.
COPY package.json package-lock.json ./
RUN npm ci

# Now copy the actual source code
COPY . .

# 8081  -> Metro bundler (JS bundling / hot reload)
# 19000 -> legacy Expo dev tools port (kept for compatibility)
# 19006 -> Expo web preview
EXPOSE 8081 19000 19006

CMD ["npx", "expo", "start"]
