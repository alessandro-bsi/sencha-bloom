import configparser
import secrets
import string
from abc import ABC, abstractmethod
from typing import Union

from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.x509 import Name

from common.utils import get_project_root, info, error, snake_to_camel, translate_openssl_to_powershell, success, \
    progress


class CertificateGenerator(ABC):
    def __init__(self, output_directory: str = "certs"):
        # Directory to save generated files
        if output_directory is None:
            output_directory = "certs"
        self.output_dir = get_project_root().joinpath(output_directory)
        self.output_dir.mkdir(exist_ok=True)
        self.alphabet = string.ascii_letters + string.digits
        self.config = configparser.ConfigParser(allow_no_value=True, interpolation=configparser.ExtendedInterpolation())
        self.config.read(get_project_root().joinpath("config", "config.ini"))
        self.passphrases = {}

    def generate_password(self, reason: str = '') -> str:
        info(f"Generating password for: {reason}")
        return ''.join([secrets.choice(self.alphabet) for _ in range(32)])

    def get_dns_name(self, name) -> str:
        try:
            return self.config.get(name, "COMMON_NAME")
        except:
            return ""

    def get_all_common_names(self) -> list:
        common_names = []
        for section in list(self.config.sections()):
            try:
                common_names.append(self.config.get(section, "COMMON_NAME"))
            except:
                continue
        return common_names

    def generate_name(self, name) -> Union[Name, None]:
        try:
            details = []

            configurations = list(self.config.items(name))
            for key, value in configurations:
                details.append(
                    x509.NameAttribute(getattr(NameOID, key.upper()), value)
                )
            return x509.Name(details)
        except configparser.NoSectionError:
            error("Certificate configuration for name '{}' not found".format(name))
            return None

    def generate_details(self, name, translate=False) -> Union[list, None]:
        try:
            details = []
            configurations = list(self.config.items(name))
            for key, value in configurations:
                real = snake_to_camel(key)
                if translate:
                    real = translate_openssl_to_powershell(real)
                details.append(
                    f"{real} = {value}"
                )
            return details
        except configparser.NoSectionError:
            error("Certificate configuration for name '{}' not found".format(name))
            return None

    def generate_all_certificates(self):
        for name in list(self.config.sections()):
            if name in ["CA", "IntermediateCA"]:
                continue
            self.generate_certificate(name)

    def print_passwords(self):
        success(f"All certificates have been generated. Keep the passphrases secret!")
        for server, passphrase in self.passphrases.items():
            progress(f"{server}: {passphrase}", indent=2)

    def save_passwords(self):
        success(f"All certificates have been generated. Keep the passphrases secret!")
        with open(self.output_dir.joinpath("credentials.csv"), "w") as fp:
            fp.write(f"name,passphrase\n")
            for server, passphrase in self.passphrases.items():
                fp.write(f"{server},{passphrase}\n")

    def clean(self):
        pass

    @abstractmethod
    def generate_certificate(self, name):
        raise NotImplementedError

    @abstractmethod
    def generate_ca_certificate(self):
        raise NotImplementedError

