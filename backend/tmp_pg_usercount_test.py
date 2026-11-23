import psycopg2
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="product_lab",
    user="postgres",
    password="nttbsp",
    connect_timeout=3,
)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM users;")
print(cur.fetchone()[0])
cur.close()
conn.close()
