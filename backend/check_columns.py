import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='Lokesh@8273', dbname='voila')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'conversations' ORDER BY ordinal_position")
for r in cur.fetchall():
    print(r[0])
conn.close()
