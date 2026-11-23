import sys
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="product_lab",
        user="postgres",
        password="nttbsp",
        connect_timeout=3,
    )
    cur = conn.cursor()
    cur.execute("SELECT 1;")
    cur.fetchone()
    cur.close()
    conn.close()
    print("OK")
except Exception as e:
    print(str(e))
    sys.exit(1)
