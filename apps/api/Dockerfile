FROM python:3.13-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ctf_api ./ctf_api

RUN useradd --system --no-create-home api
USER api

EXPOSE 8000
CMD ["uvicorn", "ctf_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
