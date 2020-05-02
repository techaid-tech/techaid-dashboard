.PHONY: all build release

REGISTRY := eu.gcr.io/retinue-io
REPOSITORY_NAME := stretech-ui
PREFIX := prod-
COMMIT_HASH := $(shell git rev-parse --short HEAD)
DOCKER_IMAGE := $(REGISTRY)/$(REPOSITORY_NAME):$(PREFIX)$(COMMIT_HASH)
ECR_REGION := us-east-1

all: release

compile:
	npm run build

compile-debug:
	npm run debug

build:
	docker build --rm --force-rm -t $(DOCKER_IMAGE) .

registry:
	aws ecr create-repository --region $(ECR_REGION) --repository-name $(REPOSITORY_NAME)

push:
	docker push $(DOCKER_IMAGE)
	docker tag $(DOCKER_IMAGE) $(REGISTRY)/$(REPOSITORY_NAME):latest
	docker push $(REGISTRY)/$(REPOSITORY_NAME):latest

release: compile build push
debug: compile-debug build push
