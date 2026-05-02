from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import sqlite3
import uuid
import mercadopago
import os

app = Flask(__name__)
CORS(app)

# 🔑 TOKEN MERCADO PAGO
sdk = mercadopago.SDK("APP_USR-1884810688336769-042512-8999a1739a1e4141696782c44adc72ea-3354519196")

# ==============================
# 🧠 BANCO DE DADOS
# ==============================
def criar_banco():
    conn = sqlite3.connect("usuarios.db")
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        cpf TEXT UNIQUE,
        email TEXT,
        senha TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE,
        nome TEXT,
        email TEXT,
        produto TEXT,
        status TEXT
    )
    """)

    conn.commit()
    conn.close()


# 🔥 MIGRAÇÃO AUTOMÁTICA (ANTI-ERRO PRA SEMPRE)
def atualizar_tabela_pedidos():
    conn = sqlite3.connect("usuarios.db")
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(pedidos)")
    colunas = [col[1] for col in cursor.fetchall()]

    if "status_producao" not in colunas:
        cursor.execute("ALTER TABLE pedidos ADD COLUMN status_producao TEXT DEFAULT 'em_producao'")

    if "status_pagamento" not in colunas:
        cursor.execute("ALTER TABLE pedidos ADD COLUMN status_pagamento TEXT DEFAULT 'inativo'")

    if "whatsapp" not in colunas:
        cursor.execute("ALTER TABLE pedidos ADD COLUMN whatsapp TEXT")

    if "descricao" not in colunas:
        cursor.execute("ALTER TABLE pedidos ADD COLUMN descricao TEXT")

    conn.commit()
    conn.close()


criar_banco()
atualizar_tabela_pedidos()

# ==============================
# 🌐 ROTAS
# ==============================
@app.route("/")
def home():
    return render_template("loginBW.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

# 🔥 NOVA TELA PÓS PAGAMENTO
@app.route("/pos-pagamento")
def pos_pagamento():
    codigo = request.args.get("external_reference")
    return render_template("pos_pagamento.html", codigo=codigo)

# ==============================
# 📝 CADASTRO
# ==============================
@app.route("/cadastrar", methods=["POST"])
def cadastrar():
    try:
        data = request.json

        conn = sqlite3.connect("usuarios.db")
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO usuarios (nome, cpf, email, senha)
        VALUES (?, ?, ?, ?)
        """, (data["nome"], data["cpf"], data["email"], data["senha"]))

        conn.commit()
        conn.close()

        return jsonify({"msg": "Conta criada com sucesso"})

    except sqlite3.IntegrityError:
        return jsonify({"msg": "CPF já cadastrado"})

# ==============================
# 🔑 LOGIN
# ==============================
@app.route("/login", methods=["POST"])
def login():
    data = request.json

    cpf = data["cpf"]
    senha = data["senha"]

    # 👑 LOGIN ADMIN (ANTES DE TUDO)
    if cpf == "00000000000" and senha == "erick0809":
        return jsonify({
            "msg": "Login OK",
            "nome": "Administrador",
            "email": "admin@bware.com",
            "admin": True
        })

    # 👤 LOGIN NORMAL
    conn = sqlite3.connect("usuarios.db")
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM usuarios WHERE cpf=? AND senha=?
    """, (cpf, senha))

    user = cursor.fetchone()
    conn.close()

    if user:
        return jsonify({
            "msg": "Login OK",
            "nome": user[1],
            "email": user[3],
            "admin": False
        })

    return jsonify({"msg": "CPF ou senha inválidos"})

# ==============================
# 💳 CRIAR PAGAMENTO
# ==============================
@app.route("/criar_pagamento", methods=["POST"])
def criar_pagamento():
    try:
        data = request.json

        codigo = str(uuid.uuid4())[:8].upper()

        conn = sqlite3.connect("usuarios.db")
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM pedidos WHERE codigo=?", (codigo,))
        while cursor.fetchone():
            codigo = str(uuid.uuid4())[:8].upper()

        cursor.execute("""
        INSERT INTO pedidos (
            codigo, nome, email, produto,
            status, status_producao, status_pagamento
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            codigo,
            "Cliente",
            data["email"],
            data["produto"],
            "pendente",
            "em_producao",
            "inativo"
        ))

        conn.commit()
        conn.close()

        preference_data = {
            "items": [
                {
                    "title": data["produto"],
                    "quantity": 1,
                    "unit_price": float(data["preco"])
                }
            ],
            "payer": {
                "email": data["email"]
            },
            "external_reference": codigo,

            # 🔥 REDIRECIONAMENTO CORRETO AGORA
            "back_urls": {
                "success": "https://bware-backend-production.up.railway.app/pos-pagamento",
                "failure": "https://bware-backend-production.up.railway.app/dashboard",
                "pending": "https://bware-backend-production.up.railway.app/dashboard"
            },
            "auto_return": "approved"
        }

        preference = sdk.preference().create(preference_data)["response"]

        return jsonify({
            "init_point": preference["init_point"]
        })

    except Exception as e:
        print("ERRO PAGAMENTO:", e)
        return jsonify({"erro": str(e)})

# ==============================
# 🔔 WEBHOOK
# ==============================
@app.route("/webhook", methods=["POST"])
def webhook():
    try:
        data_json = request.json
        data_args = request.args

        payment_id = None

        if data_json and "data" in data_json:
            payment_id = data_json["data"].get("id")

        if not payment_id:
            payment_id = data_args.get("data.id")

        if not payment_id:
            return "OK", 200

        payment = sdk.payment().get(payment_id)["response"]

        if payment.get("status") == "approved":
            codigo = payment.get("external_reference")

            conn = sqlite3.connect("usuarios.db")
            cursor = conn.cursor()

            cursor.execute("""
            UPDATE pedidos
            SET status='pago',
                status_pagamento='ativo'
            WHERE codigo=?
            """, (codigo,))

            conn.commit()
            conn.close()

            print(f"🔥 PEDIDO CONFIRMADO: {codigo}")

        return "OK", 200

    except Exception as e:
        print("ERRO WEBHOOK:", e)
        return "Erro", 500

# ==============================
# 📩 FINALIZAR PEDIDO (NOVO)
# ==============================
@app.route("/finalizar_pedido", methods=["POST"])
def finalizar_pedido():
    try:
        data = request.json

        conn = sqlite3.connect("usuarios.db")
        cursor = conn.cursor()

        cursor.execute("""
        UPDATE pedidos
        SET whatsapp=?,
            descricao=?,
            status_producao='aguardando_info'
        WHERE codigo=?
        """, (
            data["whatsapp"],
            data["descricao"],
            data["codigo"]
        ))

        conn.commit()
        conn.close()

        return jsonify({"msg": "Pedido finalizado com sucesso"})

    except Exception as e:
        print("ERRO FINALIZAR:", e)
        return jsonify({"erro": str(e)})

# ==============================
# 📦 LISTAR PEDIDOS
# ==============================
@app.route("/pedidos")
def listar_pedidos():
    email = request.args.get("email")
    is_admin = request.args.get("admin") == "true"

    conn = sqlite3.connect("usuarios.db")
    cursor = conn.cursor()

    if is_admin:
        # 👑 ADMIN VÊ TUDO
        cursor.execute("""
        SELECT codigo, produto, status_producao, status_pagamento, whatsapp, email
        FROM pedidos
        """)
    else:
        # 👤 USUÁRIO NORMAL VÊ SÓ OS DELE
        cursor.execute("""
        SELECT codigo, produto, status_producao, status_pagamento, whatsapp
        FROM pedidos
        WHERE email=?
        """, (email,))

    pedidos = cursor.fetchall()
    conn.close()

    return jsonify(pedidos)

# ==============================
# 🚀 RUN
# ==============================
import os

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
