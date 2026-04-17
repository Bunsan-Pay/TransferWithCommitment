# sdk_js 結合テスト用: Foundry + Bun。anvil への RPC は docker compose の
# service 名 `anvil` を経由して到達する。
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
      ca-certificates \
      curl \
      git \
      jq \
      unzip \
 && rm -rf /var/lib/apt/lists/*

ARG BUN_VERSION=1.1.38
ENV BUN_INSTALL="/opt/bun"
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

RUN curl -fsSL https://bun.sh/install | \
      bash -s "bun-v${BUN_VERSION}" \
 && ln -sf "${BUN_INSTALL}/bin/bun" /usr/local/bin/bun \
 && ln -sf "${BUN_INSTALL}/bin/bun" /usr/local/bin/bunx

# build.context を docker/entrypoints/ に絞っているので、ここはコンテキスト直下を丸ごと COPY する。
COPY . /opt/entrypoints/
RUN chmod +x /opt/entrypoints/*.sh

WORKDIR /work

ENTRYPOINT []
CMD ["bash"]
