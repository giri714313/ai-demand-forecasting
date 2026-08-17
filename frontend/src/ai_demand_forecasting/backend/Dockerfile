FROM python:3.12-slim

WORKDIR /app

# LightGBM requires libgomp at runtime -- not included in the slim base image
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render/Railway inject $PORT at runtime; default to 8000 for local docker run
ENV PORT=8000
EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
