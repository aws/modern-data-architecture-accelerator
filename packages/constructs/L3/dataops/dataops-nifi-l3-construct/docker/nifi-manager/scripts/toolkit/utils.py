import logging
import os
import time
import pexpect

nifi_toolkit_cli = f"{os.environ['NIFI_TOOLKIT_HOME']}/bin/cli.sh"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Authorizations")
logger.setLevel(logging.INFO)

toolkit_child = None
toolkit_child_timestamp = time.time()

def get_toolkit_process():
    global toolkit_child,toolkit_child_timestamp
    if toolkit_child is not None and time.time() - toolkit_child_timestamp > 3600 and toolkit_child.isalive():
        logger.info(f"Restarting child after 1 hour")
        toolkit_child.kill(0)

    if toolkit_child is None or not toolkit_child.isalive():
        toolkit_child_timestamp = time.time()
        logger.info("Toolkit not running. Spawning child process.")
        os.environ['TERM'] = 'dumb'
        toolkit_child = pexpect.spawn(
            f"bash --noediting -c 'stty -icanon & {nifi_toolkit_cli}'", echo=False, dimensions=(1000, 10000))
        toolkit_child.expect('#>')
    return toolkit_child


def nifi_toolkit_pexpect(nifi_app, cmd):
    toolkit_process = get_toolkit_process()
    sendline = nifi_app + ' ' + ' '.join(cmd)
    toolkit_process.sendline(sendline)
    toolkit_process.expect('#>*')
    before = toolkit_process.before
    # print(f"RAW: \n------\n{before}\n------\n")
    # print(f"Raw Decoded: \n------\n{before.decode('ascii')}\n------\n")
    output = before.decode(
        'ascii').strip(sendline).strip()
    # print(f"Output: \n------\n{output}\n------\n")
    return output


def nifi_toolkit(nifi_app, args):
    while True:

        cmd = args + ["-ot", "json"]
        logger.info(f"Executing cmd: {' '.join(cmd)}")
        starttime = time.time()
        output = nifi_toolkit_pexpect(nifi_app, cmd)
        elapsed = time.time() - starttime
        logger.info(f"Command took {elapsed} seconds")

        if "ERROR:" in output:
            if 'connect timed out' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Timeout.")
            elif 'No route to host' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. No route to host.")
            elif 'Connection refused' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Connection refused.")
            elif 'The Flow Controller is initializing the Data Flow' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Initializing flow.")
            elif 'Cannot replicate request' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Cannot replicate request. Node disconnected.")
            elif 'no nodes are connected' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. No nodes are connected.")
            elif 'is currently connecting' in output:
                logger.warning(
                    "Cannot connect to Nifi using toolkit. Node is currently connecting.")
            else:
                logger.error(f"Nifi Toolkit Exception: {output}")
                raise Exception(f"Nifi Toolkit Exception: {output}")
        else:
            return output
        logger.info("Retrying in 10 seconds.")
        time.sleep(10)
