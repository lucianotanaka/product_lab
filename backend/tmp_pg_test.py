import psycopg2

print("TRY_POSTGRES")
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="product_lab",
    user="postgres",
    password="nttbsp",
    connect_timeout=3,
)
cur = conn.cursor()
cur.execute("select current_database(), current_user")
print(cur.fetchone())
cur.close()
conn.close()
print("OK")
