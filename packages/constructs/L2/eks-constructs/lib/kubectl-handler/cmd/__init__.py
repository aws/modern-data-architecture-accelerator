import json
import logging
import os
import subprocess
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# these are coming from the kubectl layer
os.environ['PATH'] = '/opt/kubectl:/opt/awscli:' + os.environ['PATH']

outdir = os.environ.get('TEST_OUTDIR', '/tmp')
kubeconfig = os.path.join(outdir, 'kubeconfig')


def cmd_handler(event, context):
    logger.info(json.dumps(dict(event, ResponseURL='...')))

    request_type = event['RequestType']
    props = event['ResourceProperties']

    # resource properties (all required)
    cluster_name = props['ClusterName']
    role_arn = props['RoleArn']

    # "log in" to the cluster
    subprocess.check_call(['aws', 'eks', 'update-kubeconfig',
                           '--role-arn', role_arn,
                           '--name', cluster_name,
                           '--kubeconfig', kubeconfig
                           ])

    if os.path.isfile(kubeconfig):
        os.chmod(kubeconfig, 0o600)

    cmd = props['Cmd']
    namespace = props['Namespace']
    timeout_seconds = props['TimeoutSeconds']

    if request_type == 'Create' or request_type == 'Update':
        output = wait_for_output(
            ['-n', namespace] + cmd, int(timeout_seconds))
        return {'Data': {'Value': str(output)}}
    elif request_type == 'Delete':
        pass
    else:
        raise Exception("invalid request type %s" % request_type)


def wait_for_output(args, timeout_seconds):

    end_time = time.time() + timeout_seconds
    error = None

    while time.time() < end_time:
        try:
            # the output is surrounded with '', so we unquote
            output = kubectl(args)
            logger.info(f"KubeCtl Output: {output}")
            if output:
                return output
        except Exception as e:
            error = str(e)
            logger.warn(f"Output Exception: {error}")
            # also a recoverable error
            if 'NotFound' in error:
                pass
        time.sleep(10)

    raise RuntimeError(
        f'Timeout waiting for output from kubectl command: {args} (last_error={error})')


def kubectl(args):
    retry = 3
    while retry > 0:
        try:
            cmd = ['kubectl', f'--kubeconfig={kubeconfig}'] + args
            logger.info(f"Executing cmd: {cmd}")
            output = subprocess.check_output(cmd, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError as exc:
            output = exc.output + exc.stderr
            if b'i/o timeout' in output and retry > 0:
                logger.info("kubectl timed out, retries left: %s" % retry)
                retry = retry - 1
            else:
                logger.warn(f"KubeCtl Exception: {output}")
                raise Exception(output)
        else:
            logger.info(output)
            return output
