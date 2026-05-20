FROM public.ecr.aws/docker/library/node:22

ENV DEBIAN_FRONTEND=noninteractive
ENV CDK_VERSION="2.x"
ENV NPM_VERSION="10.x"
ENV LERNA_VERSION="9.x"
ENV NODE_OPTIONS=--max_old_space_size=4096

# Create non-root user
RUN groupadd -r -g 1001 pipelineuser && useradd -r -u 1001 -g 1001 -m pipelineuser

############ Installed from root scope ############

# Update package lists and install security updates
RUN apt-get update -y && apt-get upgrade -y

# Install essential packages
RUN apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    gnupg \
    lsb-release \
    git \
    zip \
    unzip \
    rsync \
    python3 \
    python3-pip \
    python3-venv \
    maven \
    make \
    build-essential \
    jq \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip

# Install git-secrets
RUN git clone https://github.com/awslabs/git-secrets.git /tmp/git-secrets && \
    cd /tmp/git-secrets && \
    make install && \
    rm -rf /tmp/git-secrets

# Install Node.js packages
RUN npm install -g \
    aws-cdk@${CDK_VERSION} \
    npm@${NPM_VERSION} \
    lerna@${LERNA_VERSION} \
    jsii \
    jsii-pacmak

# Install Python packages
COPY requirements-dev.txt /tmp/requirements-dev.txt
RUN python3 -m pip install --break-system-packages -r /tmp/requirements-dev.txt && \
    rm /tmp/requirements-dev.txt

# Install SonarQube scanner
RUN wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-8.0.1.6346-linux-x64.zip && \
    unzip -q sonar-scanner-cli-8.0.1.6346-linux-x64.zip && \
    mv sonar-scanner-8.0.1.6346-linux-x64 /opt/sonar-scanner && \
    rm -f sonar-scanner-cli-8.0.1.6346-linux-x64.zip

# Install Terraform
RUN wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update -y && \
    apt-get install -y --no-install-recommends terraform && \
    rm -rf /var/lib/apt/lists/*

# GitLab Runner's helper container clones the repo as root; pipelineuser then needs to
# reclaim ownership before npm ci (which chmods workspace bin files and requires owner UID).
# Scope sudo to chown only so this stays narrow.
RUN echo "pipelineuser ALL=(root) NOPASSWD: /bin/chown" > /etc/sudoers.d/pipelineuser-chown && \
    chmod 440 /etc/sudoers.d/pipelineuser-chown

USER pipelineuser

############ Installed from pipelineuser scope ############

# Install UV for python testing
# Note: it needs dash (e.g. $ sh) according to the docs
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Kiro CLI for headless risk assessment in CI
# Note: it needs $ bash according to the docs
RUN curl -LsSf https://cli.kiro.dev/install | bash

ENV PATH="/home/pipelineuser/.local/bin:/opt/sonar-scanner/bin:$PATH"
