#checkov:skip=CKV_DOCKER_2: HEALTHCHECK not required
FROM public.ecr.aws/lambda/python:3.12

USER testuser

# Copy the function code to the LAMBDA_TASK_ROOT directory
# This environment variable is provided by the lambda base image
COPY test.py ${LAMBDA_TASK_ROOT}

# Set the CMD to the function handler
CMD [ "test.lambda_handler" ]