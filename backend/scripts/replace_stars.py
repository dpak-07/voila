p = r"C:\Users\rloke\OneDrive\Documents\GitHub\voila\backend\algorithms\db_connector.py"
with open(p, 'rb') as f:
    b = f.read()
s = b.decode('utf-8', errors='replace')
if '******' not in s:
    print('No stars found')
else:
    s2 = s.replace('******', 'password=settings.snowflake_password,')
    with open(p, 'wb') as f:
        f.write(s2.encode('utf-8'))
    print('Replaced all occurrences of ******')
