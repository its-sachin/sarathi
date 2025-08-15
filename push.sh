#!/bin/bash

# Check if commit message is provided
if [ -z "$1" ]; then
    echo "Usage: ./push.sh \"commit message\""
    exit 1
fi

# Add all changes
git add .

# Commit with provided message
git commit -m "$1"

# Push to origin master
git push origin master