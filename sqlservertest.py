import pyodbc

conn = pyodbc.connect(
    'DRIVER={ODBC Driver 17 for SQL Server};'
    'SERVER=localhost;'
    'PORT=1433;'
    'UID=sa;'
    'PWD=<YourStrong!Passw0rd>'
)

cursor = conn.cursor()
cursor.execute("SELECT @@version;")
row = cursor.fetchone()
print(row)
