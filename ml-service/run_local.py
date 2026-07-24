"""
Local development startup script
Tests database connectivity before starting the server
"""
import sys
import logging
from database import init_db_pool, test_connection, close_db_pool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """Test database and start development server"""
    logger.info("Testing database connectivity...")
    
    try:
        # Initialize connection pool
        init_db_pool(min_conn=1, max_conn=5)
        
        # Test connection
        if test_connection():
            logger.info("✓ Database connection successful!")
            logger.info("Starting development server...")
            
            # Close pool before uvicorn starts (it will reinitialize)
            close_db_pool()
            
            # Start uvicorn
            import uvicorn
            uvicorn.run(
                "main:app",
                host="0.0.0.0",
                port=8000,
                reload=True,
                log_level="info"
            )
        else:
            logger.error("✗ Database connection failed!")
            logger.error("Please check your DATABASE_URL in .env file")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"✗ Startup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
