import sqlite3
from pathlib import Path

from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"
DB_PATH = INSTANCE_DIR / "guardioes.db"


def get_db_connection():
    # O SQLite não cria pastas: garantimos que instance/ exista.
    INSTANCE_DIR.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
            senha TEXT NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS partidas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            pontos INTEGER NOT NULL,
            nivel INTEGER NOT NULL,
            tempo INTEGER NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    """)

    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_partidas_usuario_pontos
        ON partidas (usuario_id, pontos DESC)
    """)

    conn.commit()
    conn.close()


def criar_usuario(nome, usuario, senha):
    conn = get_db_connection()
    senha_hash = generate_password_hash(senha)
    try:
        conn.execute(
            "INSERT INTO usuarios (nome, usuario, senha) VALUES (?, ?, ?)",
            (nome, usuario, senha_hash),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()


def buscar_usuario_por_username(usuario):
    conn = get_db_connection()
    usuario_db = conn.execute(
        "SELECT * FROM usuarios WHERE usuario = ?",
        (usuario,),
    ).fetchone()
    conn.close()
    return usuario_db


def buscar_usuario_por_id(user_id):
    conn = get_db_connection()
    usuario = conn.execute(
        "SELECT * FROM usuarios WHERE id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    return usuario


def verificar_senha(senha_digitada, senha_hash):
    return check_password_hash(senha_hash, senha_digitada)


def registrar_partida(usuario_id, pontos, nivel, tempo):
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO partidas (usuario_id, pontos, nivel, tempo)
        VALUES (?, ?, ?, ?)
        """,
        (usuario_id, pontos, nivel, tempo),
    )
    conn.commit()
    conn.close()


def melhor_partida_do_usuario(usuario_id):
    conn = get_db_connection()
    linha = conn.execute(
        """
        SELECT pontos, nivel, tempo
        FROM partidas
        WHERE usuario_id = ?
        ORDER BY pontos DESC, tempo ASC, id ASC
        LIMIT 1
        """,
        (usuario_id,),
    ).fetchone()
    conn.close()
    return linha


def listar_ranking(limit=10):
    """Ranking com a MELHOR partida de cada jogador (uma linha por pessoa)."""
    conn = get_db_connection()
    ranking = conn.execute(
        """
        SELECT u.nome, u.usuario, p.pontos, p.nivel, p.tempo
        FROM partidas p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = (
            SELECT p2.id
            FROM partidas p2
            WHERE p2.usuario_id = p.usuario_id
            ORDER BY p2.pontos DESC, p2.tempo ASC, p2.id ASC
            LIMIT 1
        )
        ORDER BY p.pontos DESC, p.tempo ASC, u.nome ASC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    conn.close()
    return ranking
