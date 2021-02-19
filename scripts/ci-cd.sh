#!/bin/sh

# env needed
# $PAT for the github personal access token

# Run tests
# disabled because ive added the rest script in the default Docerfile to reduce on time
# docker build -f ./Dockerfile.test . --build-arg PAT=$PAT

# Docker registy login
echo $PAT | docker login --username jamestiberiuskirk --password-stdin https://ghcr.io 

# Build and push the docker image
docker build -t ghcr.io/jamestiberiuskirk/fl-tracking-points:latest . --build-arg PAT=$PAT
docker push ghcr.io/jamestiberiuskirk/fl-tracking-points:latest # This is disabled in the template