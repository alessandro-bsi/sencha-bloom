import configparser
from typing import Union

from cryptography import x509
from cryptography.x509 import Certificate
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
from cryptography.hazmat.primitives.serialization import BestAvailableEncryption
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.x509 import load_pem_x509_certificate

from datetime import datetime, timedelta
import pathlib

from sanitize_filename import sanitize

from generators.generator import CertificateGenerator
from common.utils import get_project_root, one_day


class NativeCertificateGenerator(CertificateGenerator):
    def __init__(self, output_directory: str = "certs"):
        super().__init__(output_directory)
        self.ca_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        self.intermediate_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        self.ca_name = self.generate_name("CA")
        self.intermediate_ca_name = self.generate_name("IntermediateCA")
        self.ca_certificate: Union[Certificate, None] = None
        self.intermediate_certificate: Union[Certificate, None] = None

        # Static password is NONONONO! Don't use in prod!
        self.passphrases["CA"] = self.passphrases["IntermediateCA"] = "SSIExam2024!!"

    def load_or_generate_ca_certificate(self):
            ca_key_path = self.output_dir.joinpath("ca_private_key.pem")
            ca_cert_path = self.output_dir.joinpath("ca_certificate.pem")

            if ca_key_path.exists() and ca_cert_path.exists():
                # Load Intermediate private key and certificate
                with open(ca_key_path, "rb") as key_file:
                    self.ca_private_key = load_pem_private_key(
                        key_file.read(),
                        password=self.passphrases.get("IntermediateCA").encode(),
                    )
                with open(ca_cert_path, "rb") as cert_file:
                    self.ca_certificate = load_pem_x509_certificate(cert_file.read())
            else:
                # Generate Intermediate certificate if not found
                self.generate_ca_certificate()

    def generate_ca_certificate(self):
        # Generate CA's certificate
        ca_certificate = (
            x509.CertificateBuilder()
            .subject_name(self.ca_name)
            .issuer_name(self.ca_name)
            .public_key(self.ca_private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.today() - one_day())
            .not_valid_after(datetime.today() + timedelta(days=10 * 365))
            .add_extension(
                x509.BasicConstraints(ca=True, path_length=None), critical=True,
            )
            .sign(self.ca_private_key, hashes.SHA256())
        )

        # Save CA's key and certificate
        (ca_private_key_pem, ca_cert_pem) = (
            self.ca_private_key.private_bytes(
                Encoding.PEM,
                PrivateFormat.PKCS8,
                BestAvailableEncryption(self.passphrases.get("CA").encode())
            ),
            ca_certificate.public_bytes(Encoding.PEM),
        )

        # CA CRT - DER Format
        ca_cert_crt = ca_certificate.public_bytes(Encoding.DER)

        # CA PFX - for Windows
        r"""
        pfx = pkcs12.serialize_key_and_certificates(
            name=b"SSI Exam CA Certificate",
            key=self.ca_private_key,
            cert=self.ca_certificate,
            cas=None,
            encryption_algorithm=serialization.BestAvailableEncryption(self.passphrases.get("CA").encode())
        )
        """
        self.output_dir.joinpath("ca_private_key.pem").write_bytes(ca_private_key_pem)
        self.output_dir.joinpath("ca_certificate.pem").write_bytes(ca_cert_pem)
        self.output_dir.joinpath("ca_certificate.crt").write_bytes(ca_cert_crt)

        self.ca_certificate = ca_certificate

    def load_or_generate_intermediate_certificate(self):
            intermediate_key_path = self.output_dir.joinpath("intermediate_private_key.pem")
            intermediate_cert_path = self.output_dir.joinpath("intermediate_certificate.pem")

            if intermediate_key_path.exists() and intermediate_cert_path.exists():
                # Load Intermediate private key and certificate
                with open(intermediate_key_path, "rb") as key_file:
                    self.intermediate_private_key = load_pem_private_key(
                        key_file.read(),
                        password=self.passphrases.get("IntermediateCA").encode(),
                    )
                with open(intermediate_cert_path, "rb") as cert_file:
                    self.intermediate_certificate = load_pem_x509_certificate(cert_file.read())
            else:
                # Generate Intermediate certificate if not found
                self.generate_intermediate_certificate()

    # Generate intermediate certificate
    def generate_intermediate_certificate(self):
        # Intermediate certificate details
        intermediate_certificate = (
            x509.CertificateBuilder()
            .subject_name(self.intermediate_ca_name)
            .issuer_name(self.ca_certificate.subject)
            .public_key(self.intermediate_private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.today() - one_day())
            .not_valid_after(datetime.today() + timedelta(days=5 * 365))
            .add_extension(
                x509.BasicConstraints(ca=True, path_length=0), critical=True,
            )
            .sign(self.ca_private_key, hashes.SHA256())
        )

        # Save Intermediate's key and certificate
        (intermediate_private_key_pem, intermediate_cert_pem) = (
            self.intermediate_private_key.private_bytes(
                Encoding.PEM,
                PrivateFormat.PKCS8,
                BestAvailableEncryption(self.passphrases.get("IntermediateCA").encode())
            ),
            intermediate_certificate.public_bytes(Encoding.PEM),
        )

        self.output_dir.joinpath("intermediate_private_key.pem").write_bytes(intermediate_private_key_pem)
        self.output_dir.joinpath("intermediate_certificate.pem").write_bytes(intermediate_cert_pem)

        # Store intermediate certificate in the object
        self.intermediate_certificate = intermediate_certificate


    def generate_certificate(self, name):
        # Server/client's information
        self.passphrases[name] = self.generate_password(f"{name} Cert")

        server_name = self.generate_name(name)

        # At this point, if the name has been generated it means the config is present
        if not server_name:
            return False

        s_name = sanitize(name)

        output_dir = self.output_dir.joinpath(s_name)
        output_dir.mkdir(exist_ok=True)

        # Generate server/client's private key
        server_private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

        # Generate server/client's certificate
        server_certificate = (
            x509.CertificateBuilder()
            .subject_name(server_name)
            .issuer_name(self.intermediate_certificate.subject)
            .public_key(server_private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(datetime.today() - one_day())
            .not_valid_after(datetime.today() + timedelta(days=365))
            .add_extension(
                x509.SubjectAlternativeName([x509.DNSName(self.get_dns_name(name))]),
                critical=False,
            )
            .sign(self.intermediate_private_key, hashes.SHA256())
        )

        # Save server's key and certificate
        (server_private_key_pem, server_cert_pem) = (
            server_private_key.private_bytes(
                Encoding.PEM,
                PrivateFormat.PKCS8,
                NoEncryption()
            ),
            server_certificate.public_bytes(Encoding.PEM),
        )

        if server_name != self.ca_certificate.subject:
            intermediate_cert_pem = self.intermediate_certificate.public_bytes(Encoding.PEM)
            full_cert_chain = server_cert_pem + intermediate_cert_pem
            output_dir.joinpath(f"fullchain.pem").write_bytes(full_cert_chain)

        output_dir.joinpath("privkey.pem").write_bytes(server_private_key_pem)
        output_dir.joinpath(f"server.pem").write_bytes(server_cert_pem)

