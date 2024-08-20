import boto3
import time
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AWS Creds")
logger.setLevel(logging.INFO)

session = boto3.Session()


def write_creds(session_creds):
    creds_profile = ["[default]"]
    creds_profile.append(f"aws_access_key_id={session_creds.access_key}")
    creds_profile.append(f"aws_secret_access_key={session_creds.secret_key}")
    creds_profile.append(f"aws_session_token={session_creds.token}")
    # Writing to file
    with open(f"{Path.home()}/.aws/credentials", "w", encoding="utf-8") as credentials_file:
        credentials_file.write('\n'.join(creds_profile))
    logger.info(f"Updated credentials file.")


session_creds = session.get_credentials()
write_creds(session_creds)
current_session_token = session_creds.token

while True:
    logger.info("Checking for updated web identity federation credentials.")
    session_creds = session.get_credentials()
    latest_session_token = session_creds.token
    if current_session_token != latest_session_token:
        logger.info(
            "Detected session token change. Writing to credentials file.")
        write_creds(session_creds)
        current_session_token = latest_session_token
    # nosemgrep
    time.sleep(60)
