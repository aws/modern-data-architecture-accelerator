# Use AWS Lambda Python 3.12 base image
FROM public.ecr.aws/lambda/python:3.12

# Copy requirements file
COPY model-interfaces/langchain/functions/request-handler/requirements.txt ${LAMBDA_TASK_ROOT}

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy genai_core package from shared layers
COPY shared/layers/python-sdk/python/genai_core ${LAMBDA_TASK_ROOT}/genai_core

# Copy function code
COPY model-interfaces/langchain/functions/request-handler/ ${LAMBDA_TASK_ROOT}

USER 993

# Set the CMD to your handler
CMD ["index.handler"]