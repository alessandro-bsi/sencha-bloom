#!/usr/bin/env bash

"$HOME/.pyenv/pytm/bin/activate/python" tm.py --dfd | dot -Tpng -o graph.png
"$HOME/.pyenv/pytm/bin/activate/python" tm.py --report templates/basic.md | pandoc -f markdown -t html > report.html
"$HOME/.pyenv/pytm/bin/activate/python" tm.py --seq | java -Djava.awt.headless=true -jar lib/plantuml-1.2024.7.jar -tpng -pipe > uml-seq.png
