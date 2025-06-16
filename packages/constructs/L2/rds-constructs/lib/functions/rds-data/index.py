import logging
import os
import random
import time

import boto3
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = {"user_agent_extra": solution_identifier}
config = config.Config(**user_agent_extra_param)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("RDS Data")

rdsData = boto3.client('rds-data')

RETRY_INTERVAL = 5  # Retry every 5 seconds
MAX_RETRY_DURATION = 10 * 60  # 10 minutes in seconds
MAX_JITTER = 0.5  # Small jitter in seconds to avoid exact same timing

def lambda_handler(event, context):
    props = event["ResourceProperties"]
    cluster_arn = props.get('cluster_arn')
    secret_arn = props.get('secret_arn')
    database_name = props.get('database_name', None)

    if event['RequestType'] == 'Create':
        logger.info("Handling Create Event")
        return run_statements(props.get('on_create_sql_statements', []), cluster_arn, secret_arn, database_name)
    elif event['RequestType'] == 'Update':
        logger.info("Handling Update Event")
        return run_statements(props.get('on_update_sql_statements', []), cluster_arn, secret_arn, database_name)
    elif event['RequestType'] == 'Delete':
        logger.info("Handling Delete Event")
        return run_statements(props.get('on_delete_sql_statements', []), cluster_arn, secret_arn, database_name)
    else:
        logger.error(f"Unhandled event type: {event['RequestType']}")
        raise ValueError(f"Unhandled event type: {event['RequestType']}")

def execute_with_retries(execute_func, **kwargs):
    """Execute function with retries every 5 seconds for up to 10 minutes for ANY type of error"""
    start_time = time.time()
    attempt = 0
    last_exception = None

    while (time.time() - start_time) < MAX_RETRY_DURATION:
        attempt += 1
        try:
            return execute_func(**kwargs)
        except Exception as e:
            last_exception = e
            error_type = e.__class__.__name__
            error_message = str(e)

            elapsed_time = time.time() - start_time
            remaining_time = MAX_RETRY_DURATION - elapsed_time

            if remaining_time <= 0:
                logger.error(f"Retry time exceeded ({MAX_RETRY_DURATION} seconds). Last error: {str(e)}")
                raise

            # Add small jitter to avoid exact timing
            sleep_time = RETRY_INTERVAL + random.uniform(0, MAX_JITTER)
            sleep_time = min(sleep_time, remaining_time)  # Don't sleep longer than remaining time

            logger.warning(f"Error encountered: {error_type}: {error_message}. "
                           f"Retrying in {sleep_time:.2f} seconds. "
                           f"Attempt {attempt}, elapsed time: {elapsed_time:.1f}s, "
                           f"remaining time: {remaining_time:.1f}s")

            time.sleep(sleep_time)

    # If we've exhausted retry time
    if last_exception:
        logger.error(f"All retry attempts failed over {MAX_RETRY_DURATION} seconds. "
                     f"Raising last exception: {str(last_exception)}")
        raise last_exception
    return None


def run_statements(statements, cluster_arn, secret_arn, database_name):
    results = []

    for statement in statements:
        logger.info(f"Running statement: {statement}")

        params = {
            "resourceArn": cluster_arn,
            "secretArn": secret_arn,
            "sql": statement
        }

        if database_name is not None:
            params["database"] = database_name

        try:
            result = execute_with_retries(rdsData.execute_statement, **params)
            results.append(result)
            logger.info("Statement executed successfully")
        except Exception as e:
            logger.error(f"Failed to execute statement after all retries: {str(e)}")
            raise

    return results