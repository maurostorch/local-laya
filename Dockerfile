# Laya decision service (https://huggingface.co/convaiinnovations/laya).
ARG PYTHON_IMAGE=python:3.11-slim-bookworm

FROM ${PYTHON_IMAGE} AS build

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# cpu works on amd64 and arm64; cu128 selects the NVIDIA CUDA 12.8 wheels.
ARG TORCH_INDEX=cpu
ARG TORCH_VERSION=2.14.0
ARG LAYA_VERSION=0.3.20
RUN pip install "torch==${TORCH_VERSION}" --index-url "https://download.pytorch.org/whl/${TORCH_INDEX}" \
    && pip install "laya[serve]==${LAYA_VERSION}" \
    && pip check

FROM ${PYTHON_IMAGE} AS runtime

# USE_TF=0 avoids a known deadlock when transformers probes for TensorFlow.
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    USE_TF=0 \
    USE_TORCH=1 \
    TOKENIZERS_PARALLELISM=false \
    HF_HOME=/home/laya/.cache/huggingface \
    LAYA_HOST=0.0.0.0 \
    LAYA_PORT=8000 \
    LAYA_DEVICE=cpu

RUN groupadd --gid 10001 laya \
    && useradd --uid 10001 --gid laya --create-home laya \
    && mkdir -p /home/laya/.cache/huggingface \
    && chown -R laya:laya /home/laya/.cache

COPY --from=build /opt/venv /opt/venv
USER laya
WORKDIR /home/laya

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10m --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ['LAYA_PORT'] + '/health', timeout=4)"

CMD ["laya-serve"]
