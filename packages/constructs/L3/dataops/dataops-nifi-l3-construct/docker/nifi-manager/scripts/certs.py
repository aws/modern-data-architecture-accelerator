
import time
import os
import shutil
from subprocess import check_output, CalledProcessError
import logging

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("Certificates")



nifi_ssl_dir = os.environ['NIFI_SSL_BASE_PATH']
cert_name = os.environ.get('NIFI_CERT_NAME', os.environ.get('HOSTNAME'))
nifi_data_dir = os.environ['NIFI_DATA_DIR']


keystore_secret_path = f"{nifi_ssl_dir}/{cert_name}/keystore.jks"
truststore_secret_path = f"{nifi_ssl_dir}/{cert_name}/truststore.jks"

keystore_target_path = f"{nifi_data_dir}/ssl/keystore/keystore.jks"
truststore_target_path = f"{nifi_data_dir}/ssl/truststore/truststore.jks"

current_keystore_mtime = os.stat(
    keystore_secret_path, follow_symlinks=True).st_mtime
current_truststore_mtime = os.stat(
    truststore_secret_path, follow_symlinks=True).st_mtime

shutil.copy(keystore_secret_path,
            keystore_target_path, follow_symlinks=True)
shutil.copy(truststore_secret_path,
            truststore_target_path, follow_symlinks=True)


def get_nifi_app_pid():
    try:
        # nosemgrep
        pid = check_output(
            ["pgrep", "-f", "app=NiFi"])
    except CalledProcessError as e:
        return None
    if pid is None:
        return None
    return int(pid.decode().strip())


def signal_restart_nifi():
    nifi_app_pid = get_nifi_app_pid()
    logger.info("Sending sig 15 to gracefully restart Nifi App")
    if (nifi_app_pid is None):
        logger.error("Error: Unable to find Nifi App pid.")
        return
    os.kill(nifi_app_pid, 15)
    waited = 0
    while get_nifi_app_pid() is not None and get_nifi_app_pid() == nifi_app_pid:
        logger.info("Waiting for Nifi to gracefully restart.")
        waited = waited + 1
        if (waited > 60):
            logger.warning(
                "Nifi app hasn't gracefully restarted after 60 seconds. Sending sig 9 to force restart.")
            os.kill(nifi_app_pid, 9)
            return
        # nosemgrep
        time.sleep(1)
    logger.info("Nifi gracefully restarted.")


while True:
    restart_nifi = False

    logger.info(
        f"Checking {keystore_secret_path} and {truststore_secret_path} for certificate changes.")

    latest_keystore_mtime = os.stat(
        keystore_secret_path, follow_symlinks=True).st_mtime
    if (latest_keystore_mtime != current_keystore_mtime):
        logger.info(
            f"Found changes to {keystore_secret_path}. Copying to {keystore_target_path}")
        shutil.copy(keystore_secret_path,
                    keystore_target_path, follow_symlinks=True)
        restart_nifi = True
    current_keystore_mtime = latest_keystore_mtime

    latest_truststore_mtime = os.stat(
        truststore_secret_path, follow_symlinks=True).st_mtime
    if (latest_keystore_mtime != current_keystore_mtime):
        logger.info(
            f"Found changes to {truststore_secret_path}. Copying to {truststore_target_path}")
        shutil.copy(truststore_secret_path,
                    truststore_target_path, follow_symlinks=True)
        restart_nifi = True
    current_truststore_mtime = latest_truststore_mtime

    if (restart_nifi):
        logger.info("Found certificate changes. Signalling nifi to restart.")
        signal_restart_nifi()
    # nosemgrep
    time.sleep(60)
