# Guardiões da Lagoa de Maricá

Projeto de serious game educativo em Flask + JavaScript Canvas.
Você pilota um barco, recolhe o lixo antes que caia na lagoa e deixa os animais em paz.

## Como rodar

1. Crie e ative o ambiente virtual
   ```bash
   python -m venv venv
   # Linux/macOS:
   source venv/bin/activate
   # Windows (PowerShell):
   venv\Scripts\Activate.ps1
   ```

2. Instale as dependências
   ```bash
   pip install -r requirements.txt
   ```

3. Inicie o servidor
   ```bash
   python app.py
   ```

4. Abra http://127.0.0.1:5000

A pasta `instance/` guarda o banco (`guardioes.db`) e a chave secreta gerada
automaticamente (`secret_key.txt`). Ela não vai para o GitHub (veja `.gitignore`).

## Variáveis de ambiente (opcionais)

| Variável        | Para que serve                                              |
|-----------------|-------------------------------------------------------------|
| `SECRET_KEY`    | Chave de sessão. Em produção, defina a sua.                 |
| `FLASK_DEBUG=1` | Liga o modo de desenvolvimento (recarrega ao salvar).       |
| `COOKIE_SEGURO=1` | Marca o cookie de sessão como Secure (use com HTTPS).     |

## Controles

- **Computador:** setas ← → ou A / D. Pausa com P ou Esc.
- **Celular:** arraste o dedo sobre o jogo ou use os botões ◀ ▶.

## Regras

- Resíduos que tocam a água reduzem a saúde da lagoa (e a água fica mais turva).
- Peixes e tartarugas que pulam da água **não** devem ser recolhidos.
- Sequências de acertos aumentam o multiplicador (até x3) e curam a lagoa.
- A cada 200 pontos o nível sobe e o jogo acelera.

## Banco de dados

- `usuarios`: id, nome, usuario, senha (hash), criado_em
- `partidas`: id, usuario_id, pontos, nivel, tempo, criado_em

O ranking mostra a melhor partida de cada jogador.

## Segurança

- Senhas com hash (Werkzeug) e consultas SQL parametrizadas.
- Proteção CSRF nos formulários e na API.
- Login com mensagem genérica e limite de tentativas por IP.
- Pontuação validada no servidor: a partida precisa ter sido iniciada, o
  tempo informado não pode passar do tempo real, a pontuação precisa caber
  no tempo jogado e o nível é calculado pelo servidor.

Como o jogo roda no navegador, nenhuma validação elimina 100% das fraudes,
mas as regras acima barram valores impossíveis.
