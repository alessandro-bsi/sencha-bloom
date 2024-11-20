#!/usr/bin/env bash

sudo apt install python3-pip python3-virtualenv
sudo apt-get install openjdk-11-jdk
sudo apt install graphviz pandoc

python3 -m virtualenv "$HOME/.pyenv/pytm"
source "$HOME/.pyenv/pytm/bin/activate"
pip3 install -r requirements.txt

