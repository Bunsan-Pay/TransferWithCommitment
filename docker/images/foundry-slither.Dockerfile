# Foundry (forge / anvil / cast) + Slither の静的解析バンドルを内包するベースイメージ。
# contracts-ci / slither / anvil の各サービスで使用する。
#
# ベースイメージ `ghcr.io/foundry-rs/foundry:${FOUNDRY_TAG}` は Debian/Ubuntu 系のため
# apt-get を使う。
ARG FOUNDRY_TAG=stable
FROM ghcr.io/foundry-rs/foundry:${FOUNDRY_TAG}

USER root

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      bash \
      build-essential \
      ca-certificates \
      curl \
      git \
      jq \
      libffi-dev \
      libssl-dev \
      pkg-config \
      python3 \
      python3-dev \
      python3-pip \
      python3-venv \
 && rm -rf /var/lib/apt/lists/*

ARG SLITHER_VERSION=0.11.3
RUN python3 -m venv /opt/slither-venv \
 && /opt/slither-venv/bin/pip install --no-cache-dir --upgrade pip wheel \
 && /opt/slither-venv/bin/pip install --no-cache-dir "slither-analyzer==${SLITHER_VERSION}"

ENV PATH="/opt/slither-venv/bin:${PATH}"

# build.context を docker/entrypoints/ に絞っているので、ここはコンテキスト直下を丸ごと COPY する。
COPY . /opt/entrypoints/
RUN chmod +x /opt/entrypoints/*.sh

WORKDIR /work

# 既定の ENTRYPOINT を無効化し、compose 側の entrypoint を優先する。
ENTRYPOINT []
CMD ["bash"]
