"""Quick database connectivity test"""
from database import init_db_pool, test_connection, close_db_pool

print("Testing database connectivity...")
init_db_pool(1, 2)
result = test_connection()
close_db_pool()
print(f"Database test: {'SUCCESS' if result else 'FAILED'}")
