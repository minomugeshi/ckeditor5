import pyodbc

# 接続情報を設定
server = 'localhost'  # SQL Server が動作しているホスト
database = 'master'   # 任意のデータベース名
username = 'sa'       # SQL Server 認証のユーザー名
password = '!Passw0rd'  # SQL Server 認証のパスワード
driver = '{ODBC Driver 18 for SQL Server}'  # 使用するドライバー

# 接続文字列を作成
connection_string = (
    f'DRIVER={driver};'
    f'SERVER={server},1433;'
    f'DATABASE={database};'
    f'UID={username};'
    f'PWD={password};'
    f'Encrypt=no;'
    f'TrustServerCertificate=yes;'
)

try:
    # データベースに接続
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()

    # クエリの実行
    cursor.execute("SELECT @@version;")
    row = cursor.fetchone()
    print("SQL Server version:")
    print(row)

    # 新しいテーブルを作成
    cursor.execute("CREATE TABLE TestTable (id INT PRIMARY KEY, name NVARCHAR(50));")
    conn.commit()
    print("Table created successfully.")

    # データを挿入
    cursor.execute("INSERT INTO TestTable (id, name) VALUES (1, 'John Doe');")
    conn.commit()
    print("Data inserted successfully.")

    # データを選択
    cursor.execute("SELECT * FROM TestTable;")
    rows = cursor.fetchall()
    for row in rows:
        print(row)

except pyodbc.Error as ex:
    print("An error occurred:", ex)

finally:
    # 接続を閉じる
    if conn:
        conn.close()