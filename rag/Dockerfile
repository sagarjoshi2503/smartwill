FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY auth.py constants.py db.py embeddings.py indexer.py main.py search.py ./

EXPOSE 8030

CMD ["python", "main.py"]
