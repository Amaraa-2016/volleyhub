# Builds the Expo web export and serves it with nginx (the native apps ship through EAS instead).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# Baked in at export time, so it must be the public backend URL for the deployed environment.
ARG EXPO_PUBLIC_API_URL=http://localhost:5090
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npx expo export --platform web

FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
