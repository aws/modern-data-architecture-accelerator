import json
import boto3
import random
import string

secrets_manager_client = boto3.client('secretsmanager')

def handler(event, context):

    # Get the secret
    secret = secrets_manager_client.get_secret_value(
        SecretId=event['SecretId']
    )

    # Decode the secret
    secret_string = secret['SecretString']
    secret_json = json.loads(secret_string)

    # Generate a new secret value
    new_secret = generate_new_secret_value()

    # Ensure secret is not repeated
    while new_secret['headerValue'] == secret_json['headerValue']:
        new_secret = generate_new_secret_value()

    # Update the secret
    secrets_manager_client.update_secret(
        SecretId=event['SecretId'],
        SecretString=json.dumps(new_secret)
    )


def generate_new_secret_value():
    # randomize the seed to current timestamp
    random.seed(time.time())
    allowed_chars = string.ascii_letters + string.digits
    secret_length = 32
    new_secret = {
        "headerValue": ''.join(random.choice(allowed_chars) for _ in range(secret_length)),
    }

    return new_secret


