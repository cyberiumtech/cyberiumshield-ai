# cybershield Email Spam Detector

A standalone machine-learning service trained on real public email messages from the [Apache SpamAssassin Public Corpus](https://spamassassin.apache.org/old/publiccorpus/).

## Architecture

- `download_dataset.py` downloads five official ham/spam archives, parses MIME messages, deduplicates exact messages, and writes provenance and SHA-256 checksums.
- `train_model.py` performs stratified 70/15/15 train/validation/test splits and trains a class-balanced word + character TF-IDF logistic regression pipeline. The validation split selects a high-precision decision threshold; the untouched test split provides final metrics.
- `app.py` loads the versioned artifact once and exposes JSON health and prediction APIs.
- `email_parser.py` safely extracts plain text from raw RFC 5322 or MIME messages.
- `signals.py` provides human-readable indicators alongside the statistical model result.

## Reproduce the model

```powershell
..\venv\Scripts\python.exe download_dataset.py
..\venv\Scripts\python.exe train_model.py
..\venv\Scripts\python.exe app.py
```

The API listens on `http://localhost:5002` by default.

## API

- `GET /api/health` returns the model version, held-out metrics, and dataset size.
- `POST /api/predict` accepts `{ "sender": "...", "subject": "...", "content": "..." }`. `content` may be a body or complete raw email source.

Submitted messages are processed in memory, are not persisted, and are never sent to another service.

For production, run behind TLS and use Waitress instead of Flask's development server:

```powershell
..\venv\Scripts\waitress-serve.exe --listen=0.0.0.0:5002 app:app
```

## Dataset note

The included normalized CSV is derived from the public SpamAssassin corpus. It contains real historical email and may include stale addresses or URLs; do not contact or visit them. Source URLs and archive hashes are recorded in `data/source_metadata.json`.
