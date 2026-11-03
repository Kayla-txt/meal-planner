@echo off
title Meal Planner Launcher
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Launch-MealPlanner.ps1"

if errorlevel 1 (
  echo.
  echo Meal Planner could not start. Review the message above.
  pause
)

