#!/bin/bash
# Simple test runner script

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo "Running pytest..."
python -m pytest -v

echo ""
echo "Test run complete!"
