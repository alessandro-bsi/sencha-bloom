import base64
import subprocess

from common.utils import info, progress


def wrap_exec(cmd: str):
    try:
        info("Executing: " + cmd)
        output = subprocess.check_output(cmd, shell=True).decode().strip()
        return output
    except subprocess.CalledProcessError as e:
        return None
    except Exception as e:
        return None


def wrap_ps_exec(cmd: str):
    try:
        progress("Executing: " + cmd, indent=2)
        encoded = base64.b64encode(cmd.encode("utf-16le")).decode().strip()
        cmd = f"powershell -nop -exec bypass -enc {encoded}"
        output = subprocess.check_output(cmd, shell=True).decode().strip()
        return output
    except subprocess.CalledProcessError as e:
        return None
    except Exception as e:
        return None
