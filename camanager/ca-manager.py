import argparse
import sys
import os

sys.path.append(".")
sys.path.append("..")

from factories.factory import CertificateGeneratorFactory
from common.utils import is_unix, fatal, is_windows, info


def main(generator_choice, output_directory, server_name=None):
    if is_windows():
        os.system('color')
    if is_unix() and generator_choice == 'powershell':
        fatal("Powershell not supported on linux")
    elif is_windows() and generator_choice == 'bash':
        fatal("Bash not supported on Windows")

    g = CertificateGeneratorFactory.from_name(generator_choice, output_directory)
    info("Generating Root CA certificate...")
    g.load_or_generate_ca_certificate()
    info("Generating Intermediate CA certificate...")
    g.load_or_generate_intermediate_certificate()
    info("Generating Server certificates...")
    if server_name:
        g.generate_certificate(name=server_name)
    else:
        g.generate_all_certificates()

    g.clean()
    g.print_passwords()
    g.save_passwords()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a certificate using specified method.")
    parser.add_argument('generator', choices=['bash', 'powershell', 'native'],
                        help="Specify the generator to use: 'bash', 'powershell', or 'native'.")
    parser.add_argument('-o', '--output', type=str,
                        help="Specify the output directory for the generated certificates")
    parser.add_argument('-n', '--name', type=str, action='append', required=False, default=None,
                        help="Specify the name of the certificate to be generated (MUST BE IN CONFIG.INI)")

    args = parser.parse_args()
    main(args.generator, args.output, args.name)
