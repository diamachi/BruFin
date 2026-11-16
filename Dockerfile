FROM node:24-alpine AS web-build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    BRUFIN_HOST=0.0.0.0 \
    BRUFIN_PORT=8080 \
    BRUFIN_DATA_DIR=/data \
    BRUFIN_WEB_DIR=/app/web
WORKDIR /app
COPY server/app.py /app/server/app.py
COPY --from=web-build /src/dist /app/web
EXPOSE 8080
VOLUME ["/data"]
CMD ["python", "/app/server/app.py"]
