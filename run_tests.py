#!/usr/bin/env python3
"""
RoadWeave Full-Stack Test Runner

Runs comprehensive tests for both backend and frontend applications.

Usage:
    python run_tests.py                    # Run all tests
    python run_tests.py --backend          # Run only backend tests
    python run_tests.py --frontend         # Run only frontend tests
    python run_tests.py --coverage         # Run with coverage reports
    python run_tests.py --ci               # Run in CI mode (no interactive)
    python run_tests.py --quick            # Run quick tests only
"""

import sys
import subprocess
import argparse
import os
import json
from pathlib import Path

def run_command(cmd, cwd=None, shell=False):
    """Run a command and return the result"""
    try:
        print(f"Running: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
        result = subprocess.run(
            cmd,
            cwd=cwd,
            shell=shell,
            capture_output=False,
            text=True
        )
        return result.returncode == 0
    except Exception as e:
        print(f"Error running command: {e}")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print("Checking dependencies...")
    
    # Check backend dependencies
    backend_dir = Path("backend")
    if not (backend_dir / "requirements-test.txt").exists():
        print("❌ Backend test requirements not found")
        return False
    
    # Check frontend dependencies
    frontend_dir = Path("frontend")
    if not (frontend_dir / "package.json").exists():
        print("❌ Frontend package.json not found")
        return False
    
    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("Installing frontend dependencies...")
        if not run_command(["npm", "install"], cwd=frontend_dir):
            print("❌ Failed to install frontend dependencies")
            return False
    
    print("✅ Dependencies check passed")
    return True

def run_backend_tests(coverage=False, quick=False):
    """Run backend pytest tests"""
    print("\n" + "="*50)
    print("RUNNING BACKEND TESTS")
    print("="*50)
    
    backend_dir = Path("backend")
    
    # Build test command
    cmd = ["python", "test.py"]
    
    if quick:
        cmd.append("--fast")
    
    if coverage:
        cmd.append("--coverage")
    
    cmd.append("--verbose")
    
    success = run_command(cmd, cwd=backend_dir)
    
    if success:
        print("✅ Backend tests passed")
    else:
        print("❌ Backend tests failed")
    
    return success

def run_frontend_tests(coverage=False, ci=False):
    """Run frontend React tests"""
    print("\n" + "="*50)
    print("RUNNING FRONTEND TESTS")
    print("="*50)
    
    frontend_dir = Path("frontend")
    
    # Build test command
    if ci:
        cmd = ["npm", "run", "test:ci"]
    elif coverage:
        cmd = ["npm", "run", "test:coverage"]
    else:
        cmd = ["npm", "test", "--", "--watchAll=false", "--passWithNoTests"]
    
    success = run_command(cmd, cwd=frontend_dir)
    
    if success:
        print("✅ Frontend tests passed")
    else:
        print("❌ Frontend tests failed")
    
    return success

def generate_test_report():
    """Generate a comprehensive test report"""
    print("\n" + "="*50)
    print("TEST SUMMARY REPORT")
    print("="*50)
    
    backend_coverage = Path("backend/htmlcov/index.html")
    frontend_coverage = Path("frontend/coverage/lcov-report/index.html")
    
    print(f"Backend coverage report: {backend_coverage.absolute()}")
    if backend_coverage.exists():
        print("✅ Backend coverage report generated")
    else:
        print("❌ Backend coverage report not found")
    
    print(f"Frontend coverage report: {frontend_coverage.absolute()}")
    if frontend_coverage.exists():
        print("✅ Frontend coverage report generated")
    else:
        print("❌ Frontend coverage report not found")

def main():
    parser = argparse.ArgumentParser(description='RoadWeave Full-Stack Test Runner')
    
    # Test selection
    test_group = parser.add_mutually_exclusive_group()
    test_group.add_argument('--backend', action='store_true', help='Run only backend tests')
    test_group.add_argument('--frontend', action='store_true', help='Run only frontend tests')
    
    # Test options
    parser.add_argument('--coverage', action='store_true', help='Generate coverage reports')
    parser.add_argument('--ci', action='store_true', help='Run in CI mode')
    parser.add_argument('--quick', action='store_true', help='Run quick tests only')
    parser.add_argument('--no-deps-check', action='store_true', help='Skip dependency check')
    
    args = parser.parse_args()
    
    print("RoadWeave Full-Stack Test Runner")
    print("================================")
    
    # Check dependencies unless skipped
    if not args.no_deps_check:
        if not check_dependencies():
            return 1
    
    success = True
    
    # Run selected tests
    if args.backend:
        success = run_backend_tests(coverage=args.coverage, quick=args.quick)
    elif args.frontend:
        success = run_frontend_tests(coverage=args.coverage, ci=args.ci)
    else:
        # Run both backend and frontend tests
        backend_success = run_backend_tests(coverage=args.coverage, quick=args.quick)
        frontend_success = run_frontend_tests(coverage=args.coverage, ci=args.ci)
        success = backend_success and frontend_success
    
    # Generate test report if coverage was requested
    if args.coverage:
        generate_test_report()
    
    # Final result
    print("\n" + "="*50)
    if success:
        print("🎉 ALL TESTS PASSED!")
        print("="*50)
        return 0
    else:
        print("💥 SOME TESTS FAILED!")
        print("="*50)
        return 1

if __name__ == '__main__':
    sys.exit(main())