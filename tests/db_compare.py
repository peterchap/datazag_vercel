#!/usr/bin/env python3
"""
PostgreSQL Schema Sync Script using Migra
This script compares dev (source) and production (target) schemas 
and generates SQL to make production match development.
"""

import os
import sys
import subprocess
from datetime import datetime
import argparse

def install_migra():
    """Install migra if not already installed"""
    try:
        import migra
        print("✓ migra is already installed")
        return True
    except ImportError:
        print("Installing migra...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "migra[pg]"])
            print("✓ migra installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install migra: {e}")
            return False

def generate_migration_sql(dev_url, prod_url, output_file=None, include_privileges=False):
    """
    Generate migration SQL using migra
    
    Args:
        dev_url (str): "postgres://devuser:devpass@localhost:5433/datazag"
        prod_url (str): "postgresql://neondb_owner:npg_YvoBpI3PHL1u@ep-lively-math-adg9ggki-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb"
        output_file (str): "C:/Users/PeterChaplin/Downloads/migration.sql"
        include_privileges (bool): "True"
    
    Returns:
        str: Migration SQL or None if error
    """
    try:
        # Build migra command
        cmd = ["migra", prod_url, dev_url]
        
        if include_privileges:
            cmd.append("--with-privileges")
            
        print(f"Running: {' '.join(cmd[:2])} [PROD_URL] [DEV_URL]")
        
        # Run migra
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        migration_sql = result.stdout
        
        if not migration_sql.strip():
            print("✓ No differences found! Schemas are already in sync.")
            return ""
        
        # Save to file if specified
        if output_file:
            with open(output_file, 'w') as f:
                f.write(f"-- Migration generated on {datetime.now()}\n")
                f.write(f"-- Source (target schema): Development\n")
                f.write(f"-- Target (current schema): Production\n")
                f.write("-- Run this SQL on PRODUCTION to match DEVELOPMENT schema\n\n")
                f.write("BEGIN;\n\n")
                f.write(migration_sql)
                f.write("\n\nCOMMIT;\n")
            print(f"✓ Migration SQL saved to: {output_file}")
        
        return migration_sql
        
    except subprocess.CalledProcessError as e:
        print(f"✗ Error running migra: {e}")
        if e.stderr:
            print(f"Error details: {e.stderr}")
        return None
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return None

def build_database_url(host, port, database, username, password=None):
    """Build PostgreSQL connection URL"""
    if password:
        return f"postgresql://{username}:{password}@{host}:{port}/{database}"
    else:
        return f"postgresql://{username}@{host}:{port}/{database}"

def main():
    parser = argparse.ArgumentParser(description="Generate SQL to sync production schema with development")
    
    # Development database options
    parser.add_argument("--dev-host", default="localhost", help="Development database host")
    parser.add_argument("--dev-port", default="5432", help="Development database port")
    parser.add_argument("--dev-db", required=True, help="Development database name")
    parser.add_argument("--dev-user", required=True, help="Development database username")
    parser.add_argument("--dev-password", help="Development database password (optional)")
    
    # Production database options
    parser.add_argument("--prod-host", required=True, help="Production database host")
    parser.add_argument("--prod-port", default="5432", help="Production database port")
    parser.add_argument("--prod-db", required=True, help="Production database name")
    parser.add_argument("--prod-user", required=True, help="Production database username")
    parser.add_argument("--prod-password", help="Production database password (optional)")
    
    # Output options
    parser.add_argument("--output", "-o", help="Output file for migration SQL")
    parser.add_argument("--with-privileges", action="store_true", help="Include privilege changes")
    parser.add_argument("--dry-run", action="store_true", help="Show migration SQL without saving")
    
    args = parser.parse_args()
    
    # Install migra if needed
    if not install_migra():
        sys.exit(1)
    
    # Prompt for passwords if not provided
    dev_password = args.dev_password
    if not dev_password:
        from getpass import getpass
        dev_password = getpass(f"Development database password for {args.dev_user}: ")
    
    prod_password = args.prod_password
    if not prod_password:
        from getpass import getpass
        prod_password = getpass(f"Production database password for {args.prod_user}: ")
    
    # Build connection URLs
    dev_url = build_database_url(
        args.dev_host, args.dev_port, args.dev_db, args.dev_user, dev_password
    )
    prod_url = build_database_url(
        args.prod_host, args.prod_port, args.prod_db, args.prod_user, prod_password
    )
    
    print("\n" + "="*60)
    print("PostgreSQL Schema Sync")
    print("="*60)
    print(f"Source (target schema): {args.dev_host}:{args.dev_port}/{args.dev_db}")
    print(f"Target (current schema): {args.prod_host}:{args.prod_port}/{args.prod_db}")
    print(f"Direction: Make PRODUCTION match DEVELOPMENT")
    print("="*60 + "\n")
    
    # Generate default output filename if not specified
    output_file = args.output_file
    if not output_file and not args.dry_run:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"migration_{timestamp}.sql"
    
    # Generate migration SQL
    migration_sql = generate_migration_sql(
        dev_url, prod_url, 
        output_file if not args.dry_run else None, 
        args.include_privileges
    )
    
    if migration_sql is None:
        sys.exit(1)
    
    if migration_sql.strip():
        print("\n" + "="*60)
        print("MIGRATION SQL PREVIEW:")
        print("="*60)
        print(migration_sql)
        print("="*60)
        
        if not args.dry_run:
            print(f"\n⚠️  IMPORTANT: Review the generated SQL in '{output_file}' before running it on production!")
            print("   This SQL will modify your production database schema.")
        else:
            print("\n💡 This was a dry run. Use --output to save the migration SQL to a file.")
    
    print("\n✓ Schema comparison completed!")

if __name__ == "__main__":
    main()