from time import sleep

from sanitize_filename import sanitize

from generators.generator import CertificateGenerator
from common.wexec import wrap_exec


class BashCertificateGenerator(CertificateGenerator):
    def __init__(self, output_directory: str = "certs"):
        super().__init__(output_directory)

    def write_openssl_config(self, details, is_ca=False):
        name = ""
        self.output_dir.joinpath('certs.db').touch(exist_ok=True)
        for d in details:
            if d.find("commonName"):
                name = d.split("=")[1].strip()
                break
        with open("/tmp/openssl.cnf", "w") as _out:
            headers = ["[ req ]",
                       "distinguished_name      = req_distinguished_name",
                       "req_extensions          = req_ext",
                       "prompt                  = no",
                       "[ req_distinguished_name ]"
                       ]
            if is_ca:
                headers[2] = "req_extensions    = v3_ca"
                footers = [
                    "[v3_ca]",
                    "basicConstraints           = critical, CA:TRUE",
                    "subjectKeyIdentifier       = hash",
                    "authorityKeyIdentifier     = keyid: always, issuer: always"
                    "default_ca                 = ca_def",
                    "[ca_def]",
                    f"new_certs_dir             = {self.output_dir}",
                    f"database                  = {self.output_dir.joinpath('certs.db')}"
                    "default_md                 = sha256"
                ]

            else:
                footers = ["[ req_ext ]",
                           "subjectAltName          = @alt_names",
                           "[ alt_names ]",
                           f"DNS.1                  = {name}",
                           "[ ca ]",
                           "default_ca              = ca_def",
                           "[ ca_def ]",
                           f"new_certs_dir          = {self.output_dir}",
                           f"database               = {self.output_dir.joinpath('certs.db')}",
                           f"private_key            = {self.output_dir.joinpath('ca_private_key.pem')}",
                           f"certificate            = {self.output_dir.joinpath('ca_certificate.pem')}",
                           f"serial                 = {self.output_dir.joinpath('serial')}",
                           f"rand_serial            = {self.output_dir.joinpath('rserial')}",
                           f"email_in_dn            = admin@ssi.com",
                           "default_md              = md5",
                           "policy                  = policy_match",
                           "[ policy_match ]",
                           "countryName = match",
                           "stateOrProvinceName     = match",
                           "organizationName        = match",
                           "organizationalUnitName  = optional",
                           "commonName              = supplied",
                           "emailAddress            = optional"
                           ]

            for line in headers + details + footers:
                # print(line)
                _out.write(line + "\n")

    def generate_certificate(self, name):
        s_name = sanitize(name).replace(" ", "_")
        details = self.generate_details(name)
        self.passphrases[name] = self.generate_password(name)

        self.write_openssl_config(details, is_ca=False)

        commands = [
            # Generate a private key for the certificate
            f"openssl genrsa -passout pass:{self.passphrases.get(name)} -out "
            f"\"{self.output_dir}/{s_name}_server_private_key.pem\" 2048",
            # Create a certificate signing request (CSR) for the certificate
            f"openssl req -config /tmp/openssl.cnf -passin pass:{self.passphrases.get(name)} "
            f"-key \"{self.output_dir}/{s_name}_server_private_key.pem\" -new -sha256 -out /tmp/server.csr.pem",
            # Use the CA to sign the server's CSR and issue the certificate
            f"openssl ca -batch -config /tmp/openssl.cnf -passin pass:{self.passphrases.get('CA')} -days 365 -notext "
            f"-md sha256 -in /tmp/server.csr.pem -out \"{self.output_dir}/{s_name}_server_certificate.pem\""
        ]

        for command in commands:
            out = wrap_exec(command)
            if out is not None:
                sleep(2)

    def generate_ca_certificate(self):

        details = self.generate_details("CA")
        self.passphrases["CA"] = self.generate_password("CA Certificate")

        self.write_openssl_config(details, is_ca=True)

        commands = [
            # Generate CA private key
            f"openssl genrsa -passout pass:{self.passphrases.get('CA')} -aes256 "
            f"-out \"{self.output_dir}/ca_private_key.pem\" 4096",
            # Create CA certificate
            f"openssl req -config /tmp/openssl.cnf -passin pass:{self.passphrases.get('CA')} "
            f"-key {self.output_dir}/ca_private_key.pem -new -x509 -days 7300 -sha256 -extensions v3_ca "
            f"-out {self.output_dir}/ca_certificate.pem",
        ]

        for command in commands:
            out = wrap_exec(command)
            if out is not None:
                sleep(2)
