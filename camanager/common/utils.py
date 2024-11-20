import base64
import ctypes
import platform
import re
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

from colorama import Fore

LINE_FEED = '\n'
CARRIAGE_RETURN = '\r'


def get_project_root() -> Path:
    return Path(__file__).parent.parent


def colors(string, color):
    return f"{color}{string}{Fore.WHITE}"


def colored(message, color: Fore, symbol="*", indent=0):
    return " " * indent + colors(f"[{symbol}] ", color) + message


def info(message, indent=0):
    print(colored(message, indent=indent, symbol="*", color=Fore.BLUE))


def fatal(message, indent=0):
    print(colored(message, indent=indent, symbol="-", color=Fore.RED))
    sys.exit(1)


def error(message, indent=0):
    print(colored(message, indent=indent, symbol="-", color=Fore.RED))


def success(message, indent=0):
    print(colored(message, indent=indent, symbol="+", color=Fore.GREEN))


def warning(message, indent=0):
    print(colored(message, indent=indent, symbol="#", color=Fore.YELLOW))


def debug(message, indent=0):
    print(colored(message, indent=indent, symbol="$", color=Fore.MAGENTA))


def progress(message, indent=0):
    print(colored(message, indent=indent, symbol=">", color=Fore.CYAN))


def wait_for_choice(message=None):
    choice = None
    while not (choice and choice in ['y', 'n']):
        if message:
            info(message)
        try:
            choice = input("[y|n] $> ")
        except KeyboardInterrupt:
            fatal("Aborted by user")
    return choice and choice.lower() == "y"


def wait_for_input_like(regex=".*"):
    value = ""
    pattern = re.compile(f"^{regex}$")
    while not (value and pattern.search(value)):
        try:
            value = input(" $> ")
        except KeyboardInterrupt:
            fatal("Aborted by user")
    return value


def choose(choices: [list, dict]):
    choice = -1
    if isinstance(choices, list):
        for i, element in enumerate(choices, start=1):
            print(f"  {str(i).zfill(3)} - {element}")
        while not 1 <= choice <= len(choices):
            try:
                choice = int(input("  $> ").strip())
            except ValueError:
                continue
            except KeyboardInterrupt:
                fatal("Aborted by user")
        return choices[choice - 1]
    elif isinstance(choices, dict):
        for i, element in choices.items():
            print(f"  {i} - {element}")
        while choice not in choices.keys():
            try:
                choice = input("  $> ").strip()
            except ValueError:
                continue
            except KeyboardInterrupt:
                fatal("Aborted by user")
        return choice

def one_day():
    return timedelta(1, 0, 0)


def is_windows():
    return platform.system() == 'Windows'


def is_unix():
    return platform.system() in ('Linux', 'Darwin')  # Darwin is macOS's system name


def snake_to_camel(snake_string):
    if not snake_string or len(snake_string) == 0:
        return snake_string
    temp = snake_string.lower().split('_')
    return temp[0] + ''.join(ele.title() for ele in temp[1:])


def is_admin() -> bool:
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def translate_openssl_to_powershell(attribute):
    translation_map = {
        "commonName": "CN",
        "countryName": "C",
        "stateOrProvinceName": "S",
        "localityName": "L",
        "organizationName": "O",
        "organizationalUnitName": "OU",
        "emailAddress": "E",
    }
    return translation_map.get(attribute, "")


