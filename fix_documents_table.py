"""
Script to add missing 'version' column to documents table
Run this once to fix the database schema
"""
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from main import app, db
from sqlalchemy import text

def fix_documents_table():
    """Add missing version column if it doesn't exist"""
    with app.app_context():
        try:
            # Check if column exists (SQLite)
            result = db.session.execute(text("""
                SELECT COUNT(*) as cnt 
                FROM pragma_table_info('documents') 
                WHERE name='version'
            """))
            exists = result.fetchone()[0] > 0
            
            if not exists:
                print("Adding 'version' column to documents table...")
                db.session.execute(text("""
                    ALTER TABLE documents 
                    ADD COLUMN version INTEGER DEFAULT 1
                """))
                db.session.commit()
                print("✓ Successfully added 'version' column")
            else:
                print("✓ 'version' column already exists")
                
        except Exception as e:
            print(f"Error: {e}")
            print("Note: If using SQLite, you may need to recreate the table")
            print("Or manually add the column using a database tool")

if __name__ == '__main__':
    fix_documents_table()
