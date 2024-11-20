from time import sleep

from sanitize_filename import sanitize

from generators.generator import CertificateGenerator
from common.utils import is_admin, error, fatal
from common.wexec import wrap_ps_exec


class PowershellCertificateGenerator(CertificateGenerator):
    def __init__(self, output_directory: str = "certs"):
        super().__init__(output_directory)
        self.__precheck()

    def __precheck(self):
        if not is_admin():
            error("Must be run as an administrator in an elevated IL process")
            fatal("Please relaunch this process as an elevated process (Run as administrator)")

    def clean(self):
        # Cleanup based on the subject
        for common_name in self.get_all_common_names():
            cmd = (f'Get-ChildItem -Path cert:\\LocalMachine\\My | '
                   f'Where-Object {{ $_.Subject -match "{common_name}" }} | '
                   f'Remove-Item')
            wrap_ps_exec(cmd)

    def generate_certificate(self, name):
        s_name = sanitize(name).replace(" ", "_")
        details = self.generate_details(name, translate=True)
        self.passphrases[name] = self.generate_password(name)

        subject = ", ".join(details)
        dns_name = self.get_dns_name(name)

        commands = [
            # Reload the root CA certificate with embedded key
            f'$passwd = ConvertTo-SecureString -String "{self.passphrases.get("CA")}" -Force -AsPlainText',
            f'$rootCert = Get-PfxData -FilePath "{self.output_dir.joinpath("MyCA.pfx")}" -Password $passwd',

            # Create a certificate signed by the root CA
            f'$cert = New-SelfSignedCertificate -DnsName "{dns_name}" -CertStoreLocation '
            f'"cert:\\LocalMachine\\My" -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(1) -Subject "{subject}"'
            f'-Signer "cert:\\LocalMachine\\My\\$($rootCert.EndEntityCertificates.ThumbPrint)" '
            f'-KeyAlgorithm RSA -KeyLength 2048 ',

            # Export the certificate
            f'Export-Certificate -Cert $cert -FilePath "{self.output_dir.joinpath(s_name + ".crt")}"',

            # Export the private key (optional, if needed)
            f'$passwd = ConvertTo-SecureString -String "{self.passphrases.get(name)}" -Force -AsPlainText',
            f'Export-PfxCertificate -Cert "cert:\\LocalMachine\\My\\$($cert.Thumbprint)" '
            f'-FilePath "{self.output_dir.joinpath(s_name + ".pfx")}" -Password $passwd',

        ]

        script = "; ".join(commands)

        out = wrap_ps_exec(script)
        print(out)

    def generate_ca_certificate(self):

        details = self.generate_details("CA", translate=True)
        self.passphrases["CA"] = self.generate_password("CA Certificate")

        subject = ", ".join(details)
        dns_name = self.get_dns_name("CA")

        commands = [
            # Create a self-signed root CA
            f'$rootCert = New-SelfSignedCertificate -DnsName "{dns_name}" -CertStoreLocation "cert:\\LocalMachine\\My" '
            f'-KeyUsageProperty All -KeyUsage CertSign, CRLSign, DigitalSignature -KeyExportPolicy Exportable '
            f'-KeyAlgorithm RSA -KeyLength 4096 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(10) '
            f' -Subject "{subject}"',

            # Export the root CA certificate with embedded key
            f'$passwd = ConvertTo-SecureString -String "{self.passphrases.get("CA")}" -Force -AsPlainText',
            # Export the root CA certificate
            f'Export-PfxCertificate -Cert $rootCert -FilePath "{self.output_dir.joinpath("MyCA.pfx")}" -Password $passwd'
        ]

        script = "; ".join(commands)

        out = wrap_ps_exec(script)
        print(out)


