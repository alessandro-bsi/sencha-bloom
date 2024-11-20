import os
import zipfile

import numpy as np
from geoip2.errors import AddressNotFoundError
from ua_parser import user_agent_parser
import re
from urllib.parse import urlparse
import geoip2.database
from datetime import datetime
import time
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction import FeatureHasher
from collections import defaultdict, Counter


def unzip_log_file(zip_file_path, output_dir=None):
    """
    Unzips a log file from a .zip archive.

    Parameters:
        zip_file_path (str): Path to the .zip file.
        output_dir (str, optional): Directory to extract the files. If None, extracts to the same directory as the .zip file.

    Returns:
        str: Path to the extracted .log file.
    """
    if not zipfile.is_zipfile(zip_file_path):
        raise ValueError(f"The file {zip_file_path} is not a valid .zip file.")

    # Set output directory to the same directory as the .zip file if not provided
    if output_dir is None:
        output_dir = os.path.dirname(zip_file_path)

    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        # List all files in the archive
        files = zip_ref.namelist()

        # Extract all files
        zip_ref.extractall(output_dir)
        print(f"Extracted files: {files}")

        # Find the first .log file in the archive
        log_files = [file for file in files if file.endswith('.log')]
        if not log_files:
            raise FileNotFoundError("No .log file found in the archive.")

        log_file_path = os.path.join(output_dir, log_files[0])
        print(f"Log file extracted to: {log_file_path}")
        return log_file_path


class LogProcessor:
    REGEX_LOG_FORMAT_VARIABLE = r'\$([a-zA-Z0-9\_]+)'
    REGEX_SPECIAL_CHARS = r'([\.\*\+\?\|\(\)\{\}\[\]])'

    def __init__(self, log_format, geoip_db_path):
        self.log_format = log_format
        self.pattern = self.build_pattern(log_format)
        self.geoip_reader = geoip2.database.Reader(geoip_db_path)

    def build_pattern(self, log_format):
        pattern = re.sub(self.REGEX_SPECIAL_CHARS, r'\\\1', log_format)
        pattern = re.sub(self.REGEX_LOG_FORMAT_VARIABLE, '(?P<\\1>.*)', pattern)
        return re.compile(pattern)

    def get_country(self, ip):
        try:
            return self.geoip_reader.country(ip).country.iso_code
        except AddressNotFoundError:
            return 'NA'

    def parse_log_line(self, line):
        match = self.pattern.match(line)
        if not match:
            return None
        item = match.groupdict()
        if item['http_host'] == 'mydomain.com':
            item['status'] = int(item['status'])
            item['body_bytes_sent'] = int(item['body_bytes_sent'])
            request_match = re.match(r'^(\w+)\s+(.*?)\s+(.*?)$', item['request'])
            if request_match:
                item['method'], item['url'], item['version'] = request_match.groups()
            item['time_local'] = int(time.mktime(
                datetime.strptime(item['time_local'].split()[0], '%d/%b/%Y:%X').timetuple()
            ))
            if item['http_referer'] != '-':
                item['ref'] = urlparse(item['http_referer']).netloc
            item['country'] = self.get_country(item['remote_addr']) or 'N/a'
            parsed_user_agent = user_agent_parser.Parse(item['http_user_agent'])
            item['browser_family'] = parsed_user_agent['user_agent']['family'] or 'N/a'
            item['os_family'] = parsed_user_agent['os']['family'] or 'N/a'

            # Remove unused fields
            del item['http_user_agent']
            del item['http_referer']
            del item['time_local']
            del item['request']
            del item['version']
            return item
        return None


class DataLoader:
    def __init__(self, log_processor, log_file_path):
        self.log_processor = log_processor
        self.log_file_path = log_file_path

    def load_data(self):
        with open(self.log_file_path, 'r') as file:
            for line in file:
                line = line.strip()
                if line:
                    item = self.log_processor.parse_log_line(line)
                    if item:
                        yield item


class AnomalyDetector:
    def __init__(self, n_estimators=10, random_state=42):
        self.vectorizer = FeatureHasher()
        self.model = IsolationForest(n_estimators=n_estimators, random_state=np.random.RandomState(random_state))

    def fit(self, data):
        X_train = self.vectorizer.fit_transform(data)
        self.model.fit(X_train)
        return X_train

    def predict(self, data):
        X_test = self.vectorizer.transform(data)
        return self.model.predict(X_test)


def main():
    # Configuration
    log_format = '$remote_addr - $time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" "$http_x_forwarded_for" $http_host'

    # Paths to required resources
    geoip_db_path = "GeoLite2-Country.mmdb"
    zip_log_file_path = "access.log.zip"
    log_file_path = "access.log"

    if not os.path.isfile(log_file_path):
        unzip_log_file(zip_log_file_path, ".")

    # Initialize components
    log_processor = LogProcessor(log_format, geoip_db_path)
    data_loader = DataLoader(log_processor, log_file_path)
    anomaly_detector = AnomalyDetector()

    # Load and preprocess data
    print("Loading data...")
    items = list(data_loader.load_data())
    print(f"Total logs loaded: {len(items)}")

    # Train the model
    print("Training anomaly detection model...")
    X_train = anomaly_detector.fit(items)
    print("Model training complete.")

    # Detect anomalies
    print("Detecting anomalies...")
    predictions = anomaly_detector.predict(items)
    anomalies = defaultdict(int)
    anomaly_count = 0

    for pos, prediction in enumerate(predictions):
        if prediction < 0:
            anomaly_count += 1
            anomalies[items[pos]['remote_addr']] += 1

    # Output results
    print(f"Total anomalies detected: {anomaly_count}")
    for ip, count in Counter(anomalies).most_common():
        print(f"IP: {ip}, Count: {count}")
    print("Processing complete.")


if __name__ == "__main__":
    main()
