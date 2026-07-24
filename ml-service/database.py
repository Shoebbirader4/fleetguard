"""
Database connection and utilities using psycopg2
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from typing import Generator
import logging

from config import settings

logger = logging.getLogger(__name__)

# Connection pool for efficient connection management
connection_pool: SimpleConnectionPool = None


def init_db_pool(min_conn: int = 2, max_conn: int = 10) -> None:
    """
    Initialize the database connection pool
    
    Args:
        min_conn: Minimum number of connections in pool
        max_conn: Maximum number of connections in pool
    """
    global connection_pool
    
    try:
        connection_pool = SimpleConnectionPool(
            min_conn,
            max_conn,
            settings.database_url
        )
        logger.info(f"Database connection pool initialized (min={min_conn}, max={max_conn})")
    except Exception as e:
        logger.error(f"Failed to initialize database connection pool: {e}")
        raise


def close_db_pool() -> None:
    """Close all connections in the pool"""
    global connection_pool
    
    if connection_pool:
        connection_pool.closeall()
        logger.info("Database connection pool closed")


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Context manager for database connections
    
    Yields:
        Database connection from pool
        
    Example:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM vehicles")
                results = cursor.fetchall()
    """
    if connection_pool is None:
        raise RuntimeError("Database connection pool not initialized. Call init_db_pool() first.")
    
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction failed: {e}")
        raise
    finally:
        connection_pool.putconn(conn)


@contextmanager
def get_db_cursor(cursor_factory=RealDictCursor) -> Generator[psycopg2.extensions.cursor, None, None]:
    """
    Context manager for database cursor with connection
    
    Args:
        cursor_factory: Cursor factory class (default: RealDictCursor for dict-like rows)
        
    Yields:
        Database cursor
        
    Example:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM vehicles WHERE tenant_id = %s", (tenant_id,))
            vehicles = cursor.fetchall()
    """
    with get_db_connection() as conn:
        cursor = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cursor
        finally:
            cursor.close()


def test_connection() -> bool:
    """
    Test database connectivity
    
    Returns:
        True if connection successful, False otherwise
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            logger.info("Database connection test successful")
            return result is not None
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False
