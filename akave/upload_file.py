import os

from mcache import PinataClient

client = PinataClient()
script_dir = os.path.dirname(os.path.abspath(__file__))
file_hash = client.upload_file(os.path.join(script_dir, "examples", "breast-cancer.csv"))
print(f"Uploaded file CID: {file_hash}")
print(f"Gateway URL: {client.urls[-1]}")
