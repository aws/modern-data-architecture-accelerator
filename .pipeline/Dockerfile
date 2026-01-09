FROM public.ecr.aws/docker/library/node:20

ENV DEBIAN_FRONTEND=noninteractive
ENV CDK_VERSION="2.x"
ENV NPM_VERSION="8.x"
ENV LERNA_VERSION="8.x"
ENV NODE_OPTIONS=--max_old_space_size=4096

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
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip

# Install UV  for python testing
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    ln -sf /root/.local/bin/uv /usr/local/bin/uv && \
    ln -sf /root/.local/bin/uvx /usr/local/bin/uvx

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
RUN pip3 install --no-cache-dir --upgrade pip --break-system-packages && \
    pip3 install --no-cache-dir --break-system-packages \
    twine \
    mkdocs \
    mkdocs-material \
    mike \
    mdx_truly_sane_lists \
    mkdocs-exclude \
    mkdocs-include-dir-to-nav \
    mkdocs-awesome-pages-plugin \
    git-remote-codecommit \
    json-schema-for-humans

# Install SonarQube scanner
RUN wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip && \
    unzip -q sonar-scanner-cli-5.0.1.3006-linux.zip && \
    mv sonar-scanner-5.0.1.3006-linux /opt/sonar-scanner && \
    rm -f sonar-scanner-cli-5.0.1.3006-linux.zip

# Install Terraform
RUN wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update -y && \
    apt-get install -y --no-install-recommends terraform && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/opt/sonar-scanner/bin:$PATH"
