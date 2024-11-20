FROM python:3.12

# Set the working directory
WORKDIR /usr/src/app

# Install dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt.txt.txt

# Copy the rest of the application code
COPY . .

CMD ["python3", "ca-manager.py", "native", "-o", "certs"]