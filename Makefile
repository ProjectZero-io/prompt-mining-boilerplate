.DEFAULT_GOAL := docker-build

# Docker build configuration
DOCKER_REGISTRY := europe-west1-docker.pkg.dev/pzero-shared/backend
DOCKER_IMAGE_NAME := prompt-mining-boilerplate
DOCKER_PLATFORM := linux/amd64
GIT_SHORT_SHA := $(shell git rev-parse --short HEAD)
DOCKER_TAG_LATEST := $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):latest
DOCKER_TAG_SHA := $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_NAME):$(GIT_SHORT_SHA)
DOCKER_PUSH_FLAG := $(if $(filter true,$(PUSH)),--push,)

.PHONY: docker-build
docker-build:
	docker buildx build \
		--platform $(DOCKER_PLATFORM) \
		--secret id=SENTRY_AUTH_TOKEN,env=SENTRY_AUTH_TOKEN \
		-t $(DOCKER_TAG_LATEST) \
		-t $(DOCKER_TAG_SHA) \
		-f ./Dockerfile \
		$(DOCKER_PUSH_FLAG) \
		.
