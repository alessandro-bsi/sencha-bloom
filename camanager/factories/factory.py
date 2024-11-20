import importlib
from typing import Union

from common.utils import fatal, get_project_root

from generators.generator import CertificateGenerator


class CertificateGeneratorFactory:

    @staticmethod
    def from_name(classname, output_directory: str = "certs", **kwargs) -> CertificateGenerator:
        _class = None
        try:
            module = importlib.import_module(f"generators.{classname.lower()}")
            _class = getattr(module, f"{classname.capitalize()}CertificateGenerator")
            return _class(output_directory, **kwargs)
        except Exception as e:
            fatal(e.__class__.__name__ + ": " + e.__str__())

    @staticmethod
    def ensure_paths():
        get_project_root().joinpath("output").mkdir(exist_ok=True)
        get_project_root().joinpath("temp").mkdir(exist_ok=True)
