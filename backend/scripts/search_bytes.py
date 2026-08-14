import sys
p = r"C:\Users\rloke\OneDrive\Documents\GitHub\voila\backend\algorithms\db_connector.py"
b = open(p,'rb').read()
print('Total bytes:', len(b))
idx_pass = b.find(b'password=settings.snowflake_password')
idx_stars = b.find(b'******')
print('index password seq:', idx_pass)
print('index stars seq:', idx_stars)
# show context around first stars
if idx_stars!=-1:
    start = max(0, idx_stars-40)
    end = min(len(b), idx_stars+120)
    print(b[start:end])
if idx_pass!=-1:
    start = max(0, idx_pass-40)
    end = min(len(b), idx_pass+120)
    print(b[start:end])
