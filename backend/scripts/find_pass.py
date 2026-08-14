import re
p = r"C:\Users\rloke\OneDrive\Documents\GitHub\voila\backend\algorithms\db_connector.py"
s = open(p,'rb').read().decode('utf-8',errors='replace')
for m in re.finditer('snowflake_password', s):
    print('pos', m.start())
    start = max(0, m.start()-80)
    end = min(len(s), m.end()+80)
    print(repr(s[start:end]))
