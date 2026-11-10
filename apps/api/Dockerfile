FROM python:3.13-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# External CLI tools used by the stego/forensics features. Keep this list in
# sync with ctf_api/core/external_tools.py. util-linux provides prlimit,
# which the sandbox uses for CPU/memory/file-size limits; 7zip and unzip are
# the extractors binwalk calls to unpack what it finds.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        binwalk \
        binutils \
        file \
        foremost \
        graphicsmagick-imagemagick-compat \
        libimage-exiftool-perl \
        outguess \
        pngcheck \
        ruby \
        steghide \
        7zip \
        unzip \
        util-linux \
    && gem install --no-document zsteg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ctf_api ./ctf_api

RUN useradd --system --no-create-home api
USER api

EXPOSE 8000
CMD ["uvicorn", "ctf_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
