import sys
path = r"C:\Users\rloke\OneDrive\Documents\GitHub\voila\backend\algorithms\db_connector.py"
with open(path, 'rb') as f:
    data = f.read().splitlines()
for i in range(187, 205):
    if i < len(data):
        line = data[i]
        try:
            text = line.decode('utf-8')
        except Exception:
            text = repr(line)
        print(f"LINE {i+1}: {text}")
        print('BYTES:', ' '.join([f"{b:02X}" for b in line]))
    else:
        print(f"LINE {i+1}: <out of range>")
