# sdk_rust 結合テスト用: Foundry + Rust toolchain。alloy/reqwest のビルドに必要な
# C ツールチェーンと OpenSSL も入れる。
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
      perl \
      pkg-config \
 && rm -rf /var/lib/apt/lists/*

# alloy 1.8 系は rustc 1.91 以上を要求する。ホスト開発環境に合わせて 1.94.1 を採用する。
# より新しい版を試したいときは `--build-arg RUST_VERSION=1.95.0` 等で上書き可能。
ARG RUST_VERSION=1.94.1
ENV RUSTUP_HOME=/opt/rustup \
    CARGO_HOME=/opt/cargo \
    PATH=/opt/cargo/bin:${PATH}

RUN curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs \
      | sh -s -- -y --no-modify-path --profile minimal --default-toolchain "${RUST_VERSION}" \
 && chmod -R a+rwX /opt/rustup /opt/cargo

# build.context を docker/entrypoints/ に絞っているので、ここはコンテキスト直下を丸ごと COPY する。
COPY . /opt/entrypoints/
RUN chmod +x /opt/entrypoints/*.sh

WORKDIR /work

ENTRYPOINT []
CMD ["bash"]
