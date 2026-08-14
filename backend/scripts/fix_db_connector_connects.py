import re
p = r"C:\Users\rloke\OneDrive\Documents\GitHub\voila\backend\algorithms\db_connector.py"
s = open(p,'rb').read().decode('utf-8',errors='replace')
orig = s

# Pattern: user=settings.snowflake_user, <whitespace> ****** <whitespace> role=
s = re.sub(r"(user=settings\.snowflake_user,)([\s\r\n\t\*]*)(role=)", r"\1\n                password=settings.snowflake_password,\n                \3", s)

# For other indent levels (more spaces)
s = re.sub(r"(user=settings\.snowflake_user,)([\s\r\n\t\*]*)(\s+role=)", r"\1\n                        password=settings.snowflake_password,\n                        role=", s)

if s == orig:
    print('No changes applied (pattern not found).')
else:
    with open(p,'wb') as f:
        f.write(s.encode('utf-8'))
    print('Applied replacements to db_connector.py')
