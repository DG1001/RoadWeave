#!/usr/bin/env python3
"""
RoadWeave Backend Test Runner

Usage:
    python test.py                 # Run all tests
    python test.py --unit          # Run only unit tests
    python test.py --integration   # Run only integration tests
    python test.py --coverage      # Run with coverage report
    python test.py --fast          # Run without slow tests
"""

import sys
import subprocess
import argparse
import os

def run_tests(args):
    """Run tests based on provided arguments"""
    
    # Base pytest command
    cmd = ['python', '-m', 'pytest']
    
    # Add test markers based on arguments
    if args.unit:
        cmd.extend(['-m', 'unit'])
    elif args.integration:
        cmd.extend(['-m', 'integration'])
    elif args.fast:
        cmd.extend(['-m', 'not slow'])
    
    # Add coverage if requested
    if args.coverage:
        cmd.extend([
            '--cov=.',
            '--cov-report=term-missing',
            '--cov-report=html:htmlcov',
            '--cov-fail-under=80'
        ])
    
    # Add verbosity
    if args.verbose:
        cmd.append('-v')
    
    # Add specific test file if provided
    if args.file:
        cmd.append(args.file)
    
    print(f"Running command: {' '.join(cmd)}")
    
    # Run the tests
    try:
        result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
        return result.returncode
    except KeyboardInterrupt:
        print("\nTests interrupted by user")
        return 1
    except Exception as e:
        print(f"Error running tests: {e}")
        return 1

def main():
    parser = argparse.ArgumentParser(description='RoadWeave Backend Test Runner')
    
    # Test type selection
    test_group = parser.add_mutually_exclusive_group()
    test_group.add_argument('--unit', action='store_true', help='Run only unit tests')
    test_group.add_argument('--integration', action='store_true', help='Run only integration tests')
    test_group.add_argument('--fast', action='store_true', help='Run without slow tests')
    
    # Coverage options
    parser.add_argument('--coverage', action='store_true', help='Run with coverage report')
    parser.add_argument('--cov-fail-under', type=int, default=80, help='Coverage threshold (default: 80)')
    
    # Output options
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--quiet', '-q', action='store_true', help='Quiet output')
    
    # Test selection
    parser.add_argument('--file', '-f', help='Run specific test file')
    
    args = parser.parse_args()
    
    # Check if pytest is available
    try:
        subprocess.run(['python', '-m', 'pytest', '--version'], 
                      capture_output=True, check=True)
    except subprocess.CalledProcessError:
        print("pytest not found. Please install testing dependencies:")
        print("pip install -r requirements-test.txt")
        return 1
    
    return run_tests(args)

if __name__ == '__main__':
    sys.exit(main())