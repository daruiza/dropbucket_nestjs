docker_push_aws: docker_image_remove docker_build_image_aws	
	docker push daruiza/dropbucket_nestjs:aws

docker_image_remove:
	docker image rm daruiza/dropbucket_nestjs:aws
docker_build_image_aws:
	docker build --target production -t daruiza/dropbucket_nestjs:aws .	