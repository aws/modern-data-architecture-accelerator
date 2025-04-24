FROM public.ecr.aws/ubuntu/ubuntu:22.04 AS core

ARG DEBIAN_FRONTEND="noninteractive"

# Install SSH, and other utilities
RUN set -ex \
    && echo 'Acquire::CompressionTypes::Order:: "gz";' > /etc/apt/apt.conf.d/99use-gzip-compression \
    && apt-get update \
    && apt install -y -qq apt-transport-https gnupg ca-certificates sudo \
    && apt-get install software-properties-common -y -qq --no-install-recommends \
    && apt-get install -y -qq --no-install-recommends openssh-client \
    && mkdir ~/.ssh \
    && mkdir -p /codebuild/image/config \
    && touch ~/.ssh/known_hosts \
    && ssh-keyscan -t rsa,dsa,ed25519,ecdsa -H github.com >> ~/.ssh/known_hosts \
    && ssh-keyscan -t rsa,dsa,ed25519,ecdsa -H bitbucket.org >> ~/.ssh/known_hosts \
    && chmod 600 ~/.ssh/known_hosts \
    && apt-get install -y -qq --no-install-recommends \
        acl apt-utils aria2 asciidoc autoconf automake \
        binutils bison brotli build-essential bzip2 bzr \
        coreutils curl dirmngr dnsutils docbook-xml docbook-xsl dpkg dpkg-dev \
        e2fsprogs expect fakeroot file findutils flex fonts-noto-color-emoji ftp \
        g++ gcc git-lfs gettext gettext-base gnupg2 groff gzip \
        haveged imagemagick iproute2 iptables jq less \
        lib32z1 libapr1 libaprutil1 libargon2-0-dev libbz2-dev \
        libc++-dev libc++abi-dev libc6-dev libcurl4-openssl-dev \
        libdb-dev libdbd-sqlite3-perl libdbi-perl libdpkg-perl \
        libedit-dev liberror-perl libevent-dev libffi-dev  \
        libgeoip-dev libgbm-dev libgconf-2-4 libglib2.0-dev libgsl-dev libgtk-3-0 \
        libhttp-date-perl libio-pty-perl libjpeg-dev libkrb5-dev liblzma-dev \
        libmagic-dev libmagickcore-dev libmagickwand-dev libmysqlclient-dev \
        libncurses5-dev libncursesw5-dev libonig-dev libpq-dev libreadline-dev \
        libsecret-1-dev libserf-1-1 libsodium-dev libsqlite3-dev libssl-dev \
        libsvn1 libsvn-perl libtcl8.6 libtidy-dev libtimedate-perl libtool libunwind8 \
        libwebp-dev libxkbfile-dev libxml2-dev libxml2-utils libxslt1-dev libxss1 \
        libyaml-dev libyaml-perl libzip-dev llvm locales lz4 \
        m4 make mediainfo mercurial mlocate net-tools netbase netcat \
        openssl patch p7zip-full p7zip-rar parallel pass patchelf pigz pkg-config pollinate procps \
        python-is-python3 python3-configobj python3-openssl rpm rsync \
        sgml-base sgml-data shellcheck sphinxsearch sqlite3 ssh sshpass subversion sudo swig systemd-coredump \
        tar tcl tcl8.6 telnet texinfo time tk tk-dev tzdata \
        unzip upx vim wget xfsprogs xml-core xmlto xorriso xsltproc \
        xvfb xz-utils zip zlib1g-dev zsync \
    && rm -rf /var/lib/apt/lists/*

ENV LC_CTYPE="C.UTF-8"

# Set locale
RUN locale-gen en_US.UTF-8 \
    && update-locale LANG=en_US.UTF-8

RUN useradd codebuild-user

#=======================End of layer: core  =================

FROM core AS tools

# Install AWS CLI v2
# https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-linux.html
RUN curl https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /opt/awscli \
    && /opt/awscli/aws/install --update -i /usr/local/aws-cli -b /usr/local/bin \
    && rm -rf /opt/awscli /tmp/* \
    && aws --version

#****************      NODEJS     ****************************************************

#nodejs
ARG SRC_DIR="/usr/src"
ARG N_SRC_DIR="$SRC_DIR/n"

ENV NODE_18_VERSION="18.20.6" \
    NODE_20_VERSION="20.18.2" \
    NODE_22_VERSION="22.13.1"

RUN git clone https://github.com/tj/n $N_SRC_DIR \
    && cd $N_SRC_DIR && make install

RUN n $NODE_18_VERSION && npm install --save-dev -g -f grunt \
    && npm install --save-dev -g -f grunt-cli \
    && npm install --save-dev -g -f webpack \
    && npm install --save-dev -g -f yarn \
    && n $NODE_20_VERSION && npm install --save-dev -g -f grunt \
    && npm install --save-dev -g -f grunt-cli \
    && npm install --save-dev -g -f webpack \
    && npm install --save-dev -g -f yarn \
    && n $NODE_22_VERSION && npm install --save-dev -g -f grunt \
    && npm install --save-dev -g -f grunt-cli \
    && npm install --save-dev -g -f webpack \
    && npm install --save-dev -g -f yarn \
    && cd / && rm -rf $N_SRC_DIR && rm -rf /tmp/*

RUN npm install -g npm@10.9.2

# Preserve latest npm version
ENV N_PRESERVE_NPM=1 \
    N_PRESERVE_COREPACK=1
#****************      END NODEJS     ****************************************************

# Verify Node.js installation
RUN node -v

# Set up working directory
WORKDIR /workdir

# Default command
CMD ["/bin/bash"]