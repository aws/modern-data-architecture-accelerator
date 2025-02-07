#checkov:skip=CKV_DOCKER_2: HEALTHCHECK not required
FROM apache/nifi-toolkit:1.23.2

USER root

RUN apt-get update \
    && apt-get install -y python3.10 pip \
    && apt-get -y autoremove \
    && apt-get clean autoclean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir boto3 pexpect 

ENV NIFI_SCRIPTS_HOME=/opt/nifi/scripts

COPY --chown=nifi ./scripts /opt/nifi/scripts

USER nifi

ENTRYPOINT [ "sh","${NIFI_SCRIPTS_HOME}/nifi_manager.sh" ]
