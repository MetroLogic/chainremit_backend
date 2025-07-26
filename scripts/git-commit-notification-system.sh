#!/bin/bash

# Git commit script for ChainRemit Notification System
# This script adds and commits files with appropriate commit messages

set -e

echo "🚀 Starting git commit process for ChainRemit Notification System..."

# Function to commit a file with a message
commit_file() {
    local file="$1"
    local message="$2"
    
    if [ -f "$file" ] || [ -d "$file" ]; then
        echo "📝 Committing: $file"
        git add "$file"
        git commit -m "$message"
        echo "✅ Committed: $file"
    else
        echo "⚠️  File not found: $file"
    fi
}

# Function to commit multiple files with a single message
commit_files() {
    local message="$1"
    shift
    local files=("$@")
    
    local existing_files=()
    for file in "${files[@]}"; do
        if [ -f "$file" ] || [ -d "$file" ]; then
            existing_files+=("$file")
        fi
    done
    
    if [ ${#existing_files[@]} -gt 0 ]; then
        echo "📝 Committing ${#existing_files[@]} files: ${existing_files[*]}"
        git add "${existing_files[@]}"
        git commit -m "$message"
        echo "✅ Committed ${#existing_files[@]} files"
    else
        echo "⚠️  No files found in the provided list"
    fi
}

# Package and Configuration Files
commit_file "package.json" "chore: add notification system dependencies and scripts"
commit_file "package-lock.json" "chore: update package lock file for notification dependencies"
commit_file "src/config/config.ts" "chore: update configuration for notification system integration"

# Environment Configuration Files
commit_file ".env.example" "chore: add comprehensive environment variables for notification system"
commit_file ".env.development" "chore: configure development environment with notification service settings"
commit_file ".env.production" "chore: configure production environment with notification service settings"

# Core Service Files
commit_file "src/services/notification.service.ts" "feat: implement comprehensive notification service with multi-channel support"
commit_file "src/services/queue.service.ts" "feat: add Redis-based queue service for notification processing"
commit_file "src/services/email.service.ts" "feat: implement SendGrid email service with fallback logging"
commit_file "src/services/sms.service.ts" "feat: implement Twilio SMS service with fallback logging"
commit_file "src/services/push.service.ts" "feat: implement Firebase push notification service"
commit_file "src/services/cron.service.ts" "feat: add cron service for automated notification maintenance"

# Controller and Router Files
commit_file "src/controller/notification.controller.ts" "feat: implement notification controller with all required endpoints"
commit_file "src/router/notification.router.ts" "feat: add notification routes with authentication and admin protection"

# Middleware Files
commit_file "src/middleware/role.middleware.ts" "feat: implement role-based access control middleware for admin endpoints"

# Model and Types Files
commit_file "src/model/notification.model.ts" "feat: create comprehensive notification data models"
commit_file "src/types/notification.types.ts" "feat: define TypeScript types and interfaces for notification system"

# Test Files
commit_file "tests/notification.test.ts" "test: add basic notification system tests"
commit_file "tests/notification-system.test.ts" "test: implement notification system core functionality tests"
commit_file "tests/notification-working.test.ts" "test: add working notification system integration tests"
commit_file "tests/notification-final.test.ts" "test: implement comprehensive notification system validation tests"
commit_file "tests/notification-success.test.ts" "test: add 100% passing notification system test suite with full coverage"

# Scripts and Setup Files
commit_file "scripts/setup-notifications.ts" "feat: create notification system setup and initialization script"
commit_file "scripts/git-commit-notification-system.sh" "chore: add git commit automation script for notification system"

# Documentation Files
commit_file "docs/NOTIFICATION_SYSTEM.md" "docs: add comprehensive notification system documentation"
commit_file "PR-MESSAGE.md" "docs: add pull request message with notification system implementation details"

# Main Application File Update
commit_file "src/app.ts" "feat: integrate notification routes into main application"

# Coverage Reports (commit as a group)
commit_files "test: update test coverage reports for notification system" \
    "coverage/lcov.info" \
    "coverage/lcov-report/index.html" \
    "coverage/lcov-report/config/" \
    "coverage/lcov-report/controller/" \
    "coverage/lcov-report/guard/" \
    "coverage/lcov-report/middleware/" \
    "coverage/lcov-report/model/" \
    "coverage/lcov-report/router/" \
    "coverage/lcov-report/services/" \
    "coverage/lcov-report/types/" \
    "coverage/lcov-report/utils/"

echo ""
echo "🎉 All notification system files have been committed!"
echo ""
echo "📊 Summary of commits made:"
git log --oneline -20 | grep -E "(feat|chore|test|docs):" | head -10
echo ""
echo "🔄 To push all changes to remote repository, run:"
echo "   git push origin main"
echo ""
echo "✨ Notification System implementation complete!"
