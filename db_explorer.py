#!/usr/bin/env python3
import sqlite3
import sys
import argparse
from typing import List, Tuple, Optional
import os
import termios
import tty
from enum import Enum


class Keys(Enum):
    UP = '\x1b[A'
    DOWN = '\x1b[B'
    RIGHT = '\x1b[C'
    LEFT = '\x1b[D'
    ENTER = '\r'
    ESC = '\x1b'
    Q = 'q'
    SPACE = ' '


def get_key():
    """Get a single keypress from stdin without pressing Enter"""
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(sys.stdin.fileno())
        key = sys.stdin.read(1)
        if key == '\x1b':  # ESC sequence
            key += sys.stdin.read(2)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    return key


def clear_screen():
    """Clear the terminal screen"""
    os.system('clear' if os.name == 'posix' else 'cls')


def print_menu(options: List[str], selected_idx: int, title: str = ""):
    """Print a menu with highlighted selection"""
    clear_screen()
    if title:
        print(title)
        print("="*len(title))
        print()
    
    for i, option in enumerate(options):
        if i == selected_idx:
            print(f"\033[47m\033[30m> {option}\033[0m")  # Highlighted
        else:
            print(f"  {option}")
    
    print("\nUse ↑/↓ arrows to navigate, Enter to select, 'q' to quit")


class DatabaseExplorer:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = None
    
    def connect(self) -> bool:
        try:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row
            return True
        except Exception as e:
            print(f"Error connecting to database: {e}")
            return False
    
    def disconnect(self):
        if self.conn:
            self.conn.close()
    
    def get_tables(self) -> List[str]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        return [row[0] for row in cursor.fetchall()]
    
    def get_table_info(self, table_name: str) -> List[Tuple[str, str]]:
        cursor = self.conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        return [(row[1], row[2]) for row in cursor.fetchall()]
    
    def get_table_count(self, table_name: str) -> int:
        cursor = self.conn.cursor()
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cursor.fetchone()[0]
    
    def get_table_data(self, table_name: str, limit: int = 10, offset: int = 0) -> List[sqlite3.Row]:
        cursor = self.conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit} OFFSET {offset}")
        return cursor.fetchall()
    
    def execute_custom_query(self, query: str) -> List[sqlite3.Row]:
        cursor = self.conn.cursor()
        cursor.execute(query)
        return cursor.fetchall()


def print_table_data(rows: List[sqlite3.Row], columns: List[str], show_row_numbers: bool = False):
    if not rows:
        print("No data found.")
        return
    
    col_widths = []
    for col in columns:
        max_width = len(col)
        for row in rows:
            if row[col] is not None:
                max_width = max(max_width, len(str(row[col])))
        col_widths.append(min(max_width, 50))
    
    if show_row_numbers:
        row_num_width = len(str(len(rows)))
        header = f"{'#'.ljust(row_num_width)} | " + " | ".join(col.ljust(width) for col, width in zip(columns, col_widths))
        separator = "-" * row_num_width + "-+-" + "-+-".join("-" * width for width in col_widths)
    else:
        header = " | ".join(col.ljust(width) for col, width in zip(columns, col_widths))
        separator = "-+-".join("-" * width for width in col_widths)
    
    print(header)
    print(separator)
    
    for i, row in enumerate(rows):
        row_data = []
        for col, width in zip(columns, col_widths):
            value = str(row[col]) if row[col] is not None else "NULL"
            if len(value) > width:
                value = value[:width-3] + "..."
            row_data.append(value.ljust(width))
        
        if show_row_numbers:
            print(f"{str(i+1).ljust(row_num_width)} | " + " | ".join(row_data))
        else:
            print(" | ".join(row_data))


def show_detailed_content(content: str, title: str = "Detailed Content"):
    """Show detailed content with pagination"""
    if not content:
        print("No content to display.")
        input("Press Enter to continue...")
        return
    
    lines = content.split('\n')
    page_size = 20
    current_page = 0
    total_pages = (len(lines) + page_size - 1) // page_size
    
    while True:
        clear_screen()
        print(f"{title}")
        print("=" * len(title))
        print(f"Page {current_page + 1} of {total_pages} | Total lines: {len(lines)}")
        print("-" * 60)
        
        start_line = current_page * page_size
        end_line = min(start_line + page_size, len(lines))
        
        for i in range(start_line, end_line):
            print(f"{i+1:4d}: {lines[i]}")
        
        print("-" * 60)
        if total_pages > 1:
            print("Navigation: ↑/↓ for pages, 'q'/ESC to exit")
        else:
            print("Press 'q'/ESC to exit")
        
        key = get_key()
        
        if key == Keys.Q.value or key == Keys.ESC.value:
            break
        elif key == Keys.UP.value and current_page > 0:
            current_page -= 1
        elif key == Keys.DOWN.value and current_page < total_pages - 1:
            current_page += 1


def select_row_and_column(explorer: DatabaseExplorer, table_name: str, rows: List[sqlite3.Row], columns: List[str]):
    """Allow user to select a row and view detailed column content"""
    if not rows:
        print("No rows to select from.")
        input("Press Enter to continue...")
        return
    
    selected_row = 0
    
    while True:
        clear_screen()
        print(f"SELECT ROW FROM {table_name} (showing {len(rows)} rows)")
        print("=" * 60)
        print_table_data(rows, columns, show_row_numbers=True)
        print("\n" + "-" * 60)
        print(f"Selected row: {selected_row + 1}")
        print("Navigation: ↑/↓ to select row, Enter to view details, 'q'/ESC to exit")
        
        key = get_key()
        
        if key == Keys.Q.value or key == Keys.ESC.value:
            break
        elif key == Keys.UP.value and selected_row > 0:
            selected_row -= 1
        elif key == Keys.DOWN.value and selected_row < len(rows) - 1:
            selected_row += 1
        elif key == Keys.ENTER.value:
            selected_row_data = rows[selected_row]
            
            # Show column selection menu
            column_options = [f"{col}: {str(selected_row_data[col])[:50]}{'...' if len(str(selected_row_data[col])) > 50 else ''}" for col in columns]
            column_options.append("Back to row selection")
            
            column_choice = navigate_menu(column_options, f"Select column to view in detail (Row {selected_row + 1}):")
            
            if column_choice != -1 and column_choice < len(columns):
                selected_column = columns[column_choice]
                content = str(selected_row_data[selected_column]) if selected_row_data[selected_column] is not None else "NULL"
                show_detailed_content(content, f"Row {selected_row + 1}, Column '{selected_column}'")


def navigate_menu(options: List[str], title: str = "") -> int:
    """Navigate through menu options using arrow keys"""
    selected_idx = 0
    
    while True:
        print_menu(options, selected_idx, title)
        key = get_key()
        
        if key == Keys.UP.value and selected_idx > 0:
            selected_idx -= 1
        elif key == Keys.DOWN.value and selected_idx < len(options) - 1:
            selected_idx += 1
        elif key == Keys.ENTER.value:
            return selected_idx
        elif key == Keys.Q.value or key == Keys.ESC.value:
            return -1


def show_table_data_with_navigation(explorer: DatabaseExplorer, table_name: str):
    """Show table data with navigation options"""
    table_info = explorer.get_table_info(table_name)
    total_rows = explorer.get_table_count(table_name)
    columns = [col[0] for col in table_info]
    
    while True:
        clear_screen()
        print(f"TABLE: {table_name}")
        print("-" * 60)
        print(f"\nColumns ({len(table_info)}):")
        for col_name, col_type in table_info:
            print(f"  - {col_name} ({col_type})")
        print(f"\nTotal rows: {total_rows}")
        
        options = [
            "View first 10 rows",
            "View last 10 rows", 
            "View specific rows (with offset)",
            "View all rows",
            "Browse rows and view column details",
            "Back to table selection"
        ]
        
        choice = navigate_menu(options, f"Options for {table_name}:")
        
        if choice == -1 or choice == 5:  # Quit or Back
            break
        elif choice == 0:  # First 10 rows
            rows = explorer.get_table_data(table_name, 10, 0)
            clear_screen()
            print(f"First 10 rows of {table_name}:")
            print_table_data(rows, columns)
            input("\nPress Enter to continue...")
        elif choice == 1:  # Last 10 rows
            offset = max(0, total_rows - 10)
            rows = explorer.get_table_data(table_name, 10, offset)
            clear_screen()
            print(f"Last 10 rows of {table_name}:")
            print_table_data(rows, columns)
            input("\nPress Enter to continue...")
        elif choice == 2:  # Specific rows
            clear_screen()
            try:
                print(f"Enter offset (0-{total_rows-1}): ", end="")
                offset = int(input())
                print("Enter number of rows to show (default 10): ", end="")
                limit = int(input() or "10")
                rows = explorer.get_table_data(table_name, limit, offset)
                clear_screen()
                print(f"Rows {offset}-{offset+len(rows)-1} of {table_name}:")
                print_table_data(rows, columns)
                input("\nPress Enter to continue...")
            except ValueError:
                print("Invalid input. Please enter numbers.")
                input("Press Enter to continue...")
        elif choice == 3:  # All rows
            if total_rows > 100:
                clear_screen()
                print(f"This table has {total_rows} rows. Continue? (y/N): ", end="")
                confirm = input()
                if confirm.lower() != 'y':
                    continue
            rows = explorer.get_table_data(table_name, total_rows, 0)
            clear_screen()
            print(f"All rows of {table_name}:")
            print_table_data(rows, columns)
            input("\nPress Enter to continue...")
        elif choice == 4:  # Browse rows and view details
            # Get a reasonable number of rows for browsing
            limit = min(50, total_rows)  # Show max 50 rows for browsing
            rows = explorer.get_table_data(table_name, limit, 0)
            select_row_and_column(explorer, table_name, rows, columns)


def main():
    parser = argparse.ArgumentParser(description="Interactive database explorer with cursor navigation")
    parser.add_argument("database", help="Path to the database file")
    args = parser.parse_args()
    
    if not os.path.exists(args.database):
        print(f"Database file '{args.database}' not found.")
        sys.exit(1)
    
    explorer = DatabaseExplorer(args.database)
    
    if not explorer.connect():
        sys.exit(1)
    
    try:
        while True:
            tables = explorer.get_tables()
            if not tables:
                print("No tables found in database.")
                break
            
            # Create menu options
            table_options = []
            for table in tables:
                count = explorer.get_table_count(table)
                table_options.append(f"{table} ({count} rows)")
            
            table_options.extend(["Execute custom SQL query", "Exit"])
            
            choice = navigate_menu(table_options, "DATABASE EXPLORER - Select a table:")
            
            if choice == -1 or choice == len(table_options) - 1:  # Quit or Exit
                break
            elif choice == len(table_options) - 2:  # Custom SQL query
                clear_screen()
                print("Enter SQL query: ", end="")
                query = input().strip()
                if query:
                    try:
                        results = explorer.execute_custom_query(query)
                        clear_screen()
                        if results:
                            columns = list(results[0].keys())
                            print("Query results:")
                            print_table_data(results, columns)
                        else:
                            print("Query executed successfully. No results returned.")
                        input("\nPress Enter to continue...")
                    except Exception as e:
                        print(f"Error executing query: {e}")
                        input("\nPress Enter to continue...")
            elif 0 <= choice < len(tables):  # Table selection
                selected_table = tables[choice]
                show_table_data_with_navigation(explorer, selected_table)
    
    except KeyboardInterrupt:
        print("\nExiting...")
    finally:
        explorer.disconnect()


if __name__ == "__main__":
    main()