@echo off
title LIEC Heav'n - PostgreSQL Bulk Insert Fix Verification
powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-postgres-bulk-insert-fix.ps1"
pause
