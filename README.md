# Laya in Docker

This directory runs [Laya](https://huggingface.co/convaiinnovations/laya) as an HTTP service in Docker. Laya is a decision model. You send it a state, such as an email, a ticket or a JSON object, and a set of typed questions. It returns an answer and a probability for each question in one forward pass. It never generates text.

The image installs the `laya[serve]` package, version 0.3.20, from PyPI. It runs the `laya-serve` server, which exposes the same `POST /v1/systemone` API as TypeSafe Jev.

## Files

| File | Purpose |
|---|---|
| `Dockerfile` | Builds the image with PyTorch and `laya[serve]` |
| `docker-compose.yml` | Runs the service on CPU |
| `docker-compose.cuda.yml` | Override that runs the service on an NVIDIA GPU |

## Requirements

You need Docker Engine or Docker Desktop with Compose v2. Give Docker at least 8 GB of RAM and 10 GB of free disk. The CPU image runs on amd64 and arm64, which includes Apple Silicon.

The GPU override needs a Linux x86_64 host with an NVIDIA GPU, a current NVIDIA driver and the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html). Docker Desktop on macOS cannot use a GPU, so use the CPU image on a Mac.

## Start the service

Run this command from this directory:

```bash
docker compose up -d --build --wait
```

The first start downloads the English checkpoint (about 808 MB) and the multilingual checkpoint (about 647 MB) from Hugging Face. No account is necessary. The container becomes healthy after both checkpoints are loaded. Later starts read the checkpoints from the `laya-model-cache` volume.

To run on an NVIDIA GPU, add the override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.cuda.yml up -d --build --wait
```

Make sure that the service is ready:

```bash
curl -s localhost:8000/health
# {"status":"ok","loaded":["english","multilingual"],"device":"cpu"}
```

## Send a request

Send a `POST` request to `/v1/systemone`. The body has one `state` and one or more `questions`:

```bash
curl -s localhost:8000/v1/systemone -H 'Content-Type: application/json' -d '{
  "state": {"body": "I was charged twice. Please refund it or I will cancel."},
  "questions": {
    "department": {
      "type": "choice",
      "instructions": "Which department should handle this?",
      "criteria": {"billing": "payments, refunds", "technical": "bugs, outages", "sales": "pricing"}
    },
    "urgency": {
      "type": "score",
      "instructions": "How urgent is this?",
      "criteria": ["not urgent", "soon", "blocking"]
    },
    "churn_risk": {
      "type": "noul",
      "instructions": "Does the user threaten to cancel?"
    }
  }
}'
```

The `state` can be a string or a JSON object. The service answers every question in the request in one forward pass. A malformed question returns HTTP 422 with a message that names the problem.

### Question types

| Type | `criteria` | Answer field | Meaning of the answer |
|---|---|---|---|
| `choice` | Object that maps each option ID to a description | `choice` | The option with the highest probability |
| `score` | Ordered list of level descriptions, lowest first | `score` | The expected level, from 0 to the last index |
| `noul` | None | `noul` | The probability that the answer is yes |

### Response

The response for the request above looks like this, shortened:

```json
{
  "answers": {
    "department": {
      "type": "choice",
      "choice": "billing",
      "probabilities": {"billing": 0.9496, "technical": 0.0208, "sales": 0.0296},
      "confidence": 0.7871,
      "answer_confidence": 0.9496
    },
    "urgency": {
      "type": "score",
      "score": 1.6331,
      "legend": {"0": "not urgent", "1": "soon", "2": "blocking"},
      "probabilities": {"0": 0.078, "1": 0.2109, "2": 0.7111}
    },
    "churn_risk": {"type": "noul", "noul": 0.9284}
  },
  "routing": {"model": "english", "reason": "English Latin text"}
}
```

Each answer also carries `action.act_probability`. The `routing` object names the checkpoint that answered and the reason for that choice. The server sends text in a non-Latin script or a language other than English to the multilingual checkpoint.

## Configuration

Set these variables in your shell or in a `.env` file next to `docker-compose.yml`. Do not commit a `.env` file that holds an API key.

| Variable | Default | Effect |
|---|---|---|
| `LAYA_PORT` | `8000` | Host port for the service |
| `LAYA_BIND_ADDRESS` | `127.0.0.1` | Host address that Docker publishes the port on |
| `LAYA_API_KEY` | empty | When set, every request except `/health` needs `Authorization: Bearer <key>` |
| `LAYA_PRELOAD` | `1` | `1` loads the checkpoints before the server accepts requests. `0` loads each checkpoint on its first request |
| `LAYA_MODELS` | `english,multilingual` | Checkpoints to preload. Add `typed-decisions` for the third checkpoint |
| `LAYA_THREADS` | `4` | CPU threads for PyTorch. Keep this value at or below the number of physical cores |
| `LAYA_DEVICE` | `cpu`, or `cuda` with the override | Device that runs the model |
| `LAYA_GPU_ID` | `0` | NVIDIA device index or UUID, with the override only |
| `LAYA_LOG_LEVEL` | `info` | Log level of the server |

Rebuild the image after you switch between the CPU and GPU files. The PyTorch build is part of the image, so a runtime variable cannot change it.

## Expose the service to other machines

By default, the port is open on `127.0.0.1` only, because the API has no authentication. Before you expose the port, set an API key:

```bash
LAYA_API_KEY=change-me LAYA_BIND_ADDRESS=0.0.0.0 docker compose up -d --wait
```

Send the key with every request:

```bash
curl -s localhost:8000/v1/systemone -H 'Authorization: Bearer change-me' \
  -H 'Content-Type: application/json' -d @request.json
```

The server does not terminate TLS. For remote clients, put a TLS reverse proxy in front of it.

## Operate the service

| Task | Command |
|---|---|
| Follow the logs | `docker compose logs -f laya` |
| Stop the service and keep the weights | `docker compose down` |
| Stop the service and delete the weights | `docker compose down --volumes` |
| Update Laya | Change `LAYA_VERSION` in `Dockerfile`, then run `docker compose up -d --build --wait` |

## Known limits

At startup, Laya warns that one checkpoint ships a temperature value outside its valid range. For the affected entries, the reported confidence is not calibrated. Measure accuracy and confidence on your own data before you use the answers in production.

On CPU, one request takes about 0.2 to 1 second. On a T4 GPU, the model card reports about 33 ms for one question.
