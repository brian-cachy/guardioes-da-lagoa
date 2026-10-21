import os
import re
import secrets
import time
from functools import wraps

from flask import (
    Flask, render_template, request, redirect, url_for, session, flash, jsonify,
)

from database import (
    INSTANCE_DIR,
    init_db,
    criar_usuario,
    buscar_usuario_por_username,
    verificar_senha,
    registrar_partida,
    melhor_partida_do_usuario,
    listar_ranking,
)

# ---------------------------------------------------------------------------
# Regras do jogo (devem bater com static/js/game.js)
# ---------------------------------------------------------------------------
PONTOS_POR_NIVEL = 200       # nível = 1 + pontos // 200
MAX_PONTOS_POR_SEGUNDO = 120  # teto folgado do que é possível no jogo
MARGEM_PONTOS = 60
MARGEM_TEMPO = 3             # segundos de tolerância entre cliente e servidor

# Limite simples de tentativas de login por IP
MAX_FALHAS_LOGIN = 8
JANELA_LOGIN_SEG = 300
_falhas_login = {}

REGEX_USUARIO = re.compile(r"^[A-Za-z0-9_]{3,20}$")


def carregar_secret_key():
    """SECRET_KEY vem do ambiente; se não existir, gera uma e guarda em instance/."""
    chave = os.environ.get("SECRET_KEY")
    if chave:
        return chave

    INSTANCE_DIR.mkdir(exist_ok=True)
    arquivo = INSTANCE_DIR / "secret_key.txt"
    if arquivo.exists():
        return arquivo.read_text().strip()

    chave = secrets.token_hex(32)
    arquivo.write_text(chave)
    return chave


app = Flask(__name__)
app.config.update(
    SECRET_KEY=carregar_secret_key(),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SEGURO") == "1",  # use 1 com HTTPS
    MAX_CONTENT_LENGTH=16 * 1024,
)

init_db()


# ---------------------------------------------------------------------------
# Proteção CSRF
# ---------------------------------------------------------------------------
def gerar_csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)
    return session["csrf_token"]


@app.context_processor
def injetar_csrf():
    return {"csrf_token": gerar_csrf_token}


@app.before_request
def proteger_csrf():
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return None

    esperado = session.get("csrf_token")
    enviado = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")

    if esperado and enviado and secrets.compare_digest(esperado, enviado):
        return None

    if request.path.startswith("/api/"):
        return jsonify({"ok": False, "erro": "Sessão expirada. Recarregue a página."}), 400

    flash("Sua sessão expirou. Tente novamente.", "warning")
    return redirect(request.path)


@app.after_request
def cabecalhos_de_seguranca(resposta):
    resposta.headers.setdefault("X-Content-Type-Options", "nosniff")
    resposta.headers.setdefault("X-Frame-Options", "DENY")
    resposta.headers.setdefault("Referrer-Policy", "same-origin")
    return resposta


# ---------------------------------------------------------------------------
# Auxiliares
# ---------------------------------------------------------------------------
def usuario_logado():
    return "user_id" in session


def login_obrigatorio(funcao):
    @wraps(funcao)
    def wrapper(*args, **kwargs):
        if not usuario_logado():
            flash("Você precisa fazer login para acessar o jogo.", "warning")
            return redirect(url_for("login"))
        return funcao(*args, **kwargs)
    return wrapper


def login_bloqueado(ip):
    agora = time.time()
    tentativas = [t for t in _falhas_login.get(ip, []) if agora - t < JANELA_LOGIN_SEG]
    _falhas_login[ip] = tentativas
    return len(tentativas) >= MAX_FALHAS_LOGIN


def registrar_falha_login(ip):
    _falhas_login.setdefault(ip, []).append(time.time())


# ---------------------------------------------------------------------------
# Páginas
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        usuario = request.form.get("usuario", "").strip()
        senha = request.form.get("senha", "")
        confirmar = request.form.get("confirmar_senha", "")

        if not nome or not usuario or not senha:
            flash("Preencha nome, usuário e senha.", "danger")
            return redirect(url_for("cadastro"))

        if len(nome) > 60:
            flash("O nome pode ter no máximo 60 caracteres.", "danger")
            return redirect(url_for("cadastro"))

        if not REGEX_USUARIO.match(usuario):
            flash("O usuário deve ter de 3 a 20 caracteres: letras, números ou _.", "danger")
            return redirect(url_for("cadastro"))

        if len(senha) < 6:
            flash("A senha deve ter pelo menos 6 caracteres.", "danger")
            return redirect(url_for("cadastro"))

        if senha != confirmar:
            flash("As senhas não conferem.", "danger")
            return redirect(url_for("cadastro"))

        if buscar_usuario_por_username(usuario):
            flash("Este usuário já existe.", "danger")
            return redirect(url_for("cadastro"))

        if not criar_usuario(nome, usuario, senha):
            flash("Não foi possível criar o usuário.", "danger")
            return redirect(url_for("cadastro"))

        flash("Cadastro realizado com sucesso! Faça login agora.", "success")
        return redirect(url_for("login"))

    return render_template("cadastro.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        ip = request.remote_addr or "desconhecido"

        if login_bloqueado(ip):
            flash("Muitas tentativas. Aguarde alguns minutos e tente de novo.", "danger")
            return redirect(url_for("login"))

        usuario = request.form.get("usuario", "").strip()
        senha = request.form.get("senha", "")

        user = buscar_usuario_por_username(usuario)

        # Mesma mensagem para usuário inexistente e senha errada,
        # assim ninguém descobre quais usuários existem.
        if not user or not verificar_senha(senha, user["senha"]):
            registrar_falha_login(ip)
            flash("Usuário ou senha incorretos.", "danger")
            return redirect(url_for("login"))

        _falhas_login.pop(ip, None)
        session.clear()  # evita reaproveitar uma sessão antiga
        session["user_id"] = user["id"]
        session["user_nome"] = user["nome"]
        session["user_usuario"] = user["usuario"]

        flash("Login realizado com sucesso!", "success")
        return redirect(url_for("jogo"))

    return render_template("login.html")


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    flash("Você saiu da conta.", "info")
    return redirect(url_for("index"))


@app.route("/jogo")
@login_obrigatorio
def jogo():
    melhor = melhor_partida_do_usuario(session["user_id"])
    return render_template("jogo.html", melhor=melhor)


@app.route("/ranking")
def ranking():
    return render_template(
        "ranking.html",
        ranking=listar_ranking(),
        usuario_atual=session.get("user_usuario"),
    )


# ---------------------------------------------------------------------------
# API da partida
# ---------------------------------------------------------------------------
@app.route("/api/partida/iniciar", methods=["POST"])
@login_obrigatorio
def iniciar_partida():
    """Marca (no servidor) a hora em que a partida começou."""
    session["partida_inicio"] = time.time()
    return jsonify({"ok": True})


@app.route("/api/partida/finalizar", methods=["POST"])
@login_obrigatorio
def finalizar_partida():
    # Cada partida iniciada só pode ser enviada uma vez.
    inicio = session.pop("partida_inicio", None)
    if inicio is None:
        return jsonify({"ok": False, "erro": "Nenhuma partida em andamento."}), 400

    dados = request.get_json(silent=True) or {}

    try:
        pontos = int(dados.get("pontos"))
        tempo = int(dados.get("tempo"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "erro": "Dados inválidos."}), 400

    if pontos < 0 or tempo < 0:
        return jsonify({"ok": False, "erro": "Valores inválidos."}), 400

    decorrido = time.time() - inicio

    # O tempo informado não pode ser maior que o que passou de verdade.
    if tempo > decorrido + MARGEM_TEMPO:
        return jsonify({"ok": False, "erro": "Pontuação recusada: tempo inconsistente."}), 400

    # A pontuação precisa ser possível para o tempo jogado.
    if pontos > max(tempo, 1) * MAX_PONTOS_POR_SEGUNDO + MARGEM_PONTOS:
        return jsonify({"ok": False, "erro": "Pontuação recusada: valor impossível para o tempo jogado."}), 400

    # O nível é calculado aqui, não aceito do navegador.
    nivel = 1 + pontos // PONTOS_POR_NIVEL

    registrar_partida(session["user_id"], pontos, nivel, tempo)
    return jsonify({"ok": True, "nivel": nivel})


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
