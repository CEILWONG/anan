# ===== 构建阶段：用 Node 编译前端 =====
FROM node:22-alpine AS build
WORKDIR /app

# 先拷贝依赖清单，利用 Docker 缓存加速
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码并构建静态文件到 dist/
COPY . .
ARG VITE_BASE=''
RUN npm run build

# ===== 运行阶段：单容器同时提供前端静态 + /api 共享后端 =====
FROM node:22-alpine
WORKDIR /app

# 只装依赖（express / js-yaml 等在 dependencies），生产不装 dev 依赖
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 拷贝构建产物、后端代码
COPY --from=build /app/dist ./dist
COPY server ./server

# 访问口令（容器启动时可通过 -e PASSKEY=xxx 覆盖）
ARG PASSKEY=''
ENV PASSKEY=${PASSKEY}
ENV PORT=3001

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server/index.mjs"]