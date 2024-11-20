#!/usr/bin/env bash

sudo docker volume prune -a -f --filter "label=local.ssi.exam"
sudo docker system prune --volumes --force --filter "label=local.ssi.exam"

sudo docker builder prune --all -f || true
sudo docker buildx prune --all -f || true
sudo -i find /var/lib/docker/overlay2/ -type f -name "*.log" -delete