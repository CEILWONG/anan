#!/usr/bin/env bash
# 云主机部署脚本：拉取指定镜像并重启容器
# 用法：./deploy.sh [TAG]    TAG 可省略，默认 latest；也可传时间戳如 20260908-1430
set -e

TAG="${1:-latest}"
IMAGE="ceilwong/anan:${TAG}"

echo ">> 拉取最新镜像 ${IMAGE}"
docker pull "${IMAGE}"

echo ">> 停止并删除旧容器（若有）"
docker rm -f anan 2>/dev/null || true

echo ">> 启动新容器"
docker run -d \
  --name anan \
  --restart unless-stopped \
  -e PASSKEY="${PASSKEY:-change-me-please}" \
  -p 8080:3001 \
  -v anan_data:/app/data \
  "${IMAGE}"

echo ">> 清理无用镜像"
docker image prune -f

echo ">> 部署完成，访问地址：http://<你的服务器公网IP>:8080"
docker ps | grep anan