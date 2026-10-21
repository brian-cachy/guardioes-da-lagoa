# 🌊 Guardiões da Lagoa de Maricá

Projeto de serious game educativo em Flask + JavaScript Canvas.
Você pilota um barco, recolhe o lixo antes que caia na lagoa e ajuda a proteger os animais e a qualidade da água.

> Acesse via navegador ou mobile: https://guardioes-da-lagoa.onrender.com/

---

## 📋 Sumário

- [1. O Problema](#1-o-problema)
- [2. A Solução](#2-a-solução)
  - [Fluxo do Jogador](#fluxo-do-jogador)
  - [Controles](#controles)
  - [Regras de Pontuação](#regras-de-pontuação)
- [3. Arquitetura e Estrutura](#3-arquitetura-e-estrutura)
  - [Estrutura de Pastas](#estrutura-de-pastas)
  - [Fluxo de uma Partida](#fluxo-de-uma-partida)
  - [Modelo de Dados](#modelo-de-dados)
- [4. Tecnologias e IA](#4-tecnologias-e-ia)
  - [Ferramentas de IA Utilizadas](#ferramentas-de-ia-utilizadas)
- [5. Como Executar](#5-como-executar)
  - [Pré-requisitos](#pré-requisitos)
  - [Passo a Passo](#passo-a-passo)
  - [Jogar pelo Celular (Wi-Fi Local)](#jogar-pelo-celular-wi-fi-local)
  - [Variáveis de Ambiente](#variáveis-de-ambiente)
  - [Troubleshooting](#troubleshooting)
- [6. Detalhes Técnicos e Segurança](#6-detalhes-técnicos-e-segurança)
  - [Limitações Conhecidas](#limitações-conhecidas)
- [7. Divisão da Equipe](#7-divisão-da-equipe)

---

## 1. O Problema

O descarte inadequado de resíduos (*copos, sacolas, latas, garrafas, bitucas de cigarro e pneus*) prejudica ecossistemas lacustres, animais, vegetação e as comunidades do entorno. A chuva leva o lixo deixado nas ruas e na areia até rios e lagoas:

- **Plásticos** se fragmentam em microplásticos, contaminando e ferindo a fauna aquática.
- **Pneus** acumulam água parada, favorecendo criadouros do mosquito da dengue.

Em Maricá, as lagoas integram a paisagem, a economia local e a rotina da população. Contudo, faltam abordagens leves, acessíveis e envolventes para conscientizar crianças e jovens. Enquanto folhetos e palestras perdem a disputa pela atenção com os celulares, um jogo consegue engajar ativamente.

---

## 2. A Solução

**Guardiões da Lagoa de Maricá** é um jogo web (compatível com desktop e mobile) que transforma conscientização ambiental em uma experiência de ação e reflexos:

* 🗑️ **Mecânica Principal:** Resíduos caem do topo da tela e o jogador move um barco para recolhê-los antes que atinjam a água.
* 💧 **Feedback Visual:** Cada resíduo não coletado reduz a saúde da lagoa, tornando a água visivelmente turva.
* 🐟 **Proteção à Fauna:** Peixes e tartarugas pulam da água e **não** devem ser recolhidos. Capturar um animal reduz a saúde e zera o combo.
* ⚡ **Multiplicador e Cura:** Sequências de acertos aumentam o multiplicador (até x3) e regeneram a saúde da lagoa (a cada 10 acertos seguidos, recupera 5 de saúde).
* 📈 **Progressão:** A cada 200 pontos o nível sobe e a velocidade aumenta.
* 📚 **Educação Ativa:** Ao interagir pela primeira vez com cada tipo de resíduo, o jogo exibe um fato educativo. Ao final da partida, exibe uma dica de consumo consciente.
* 🏆 **Competição Saudável:** Sistema de cadastro, login e ranking para incentivar o engajamento entre turmas e alunos.

### Fluxo do Jogador

```text
Página Inicial ➔ Cadastro / Login ➔ Jogo ➔ Fim de Partida (Pontos + Dica) ➔ Ranking
```

### Controles

| Dispositivo | Como jogar |
| :--- | :--- |
| **Computador** | Setas `←` `→` ou teclas `A` / `D`. Pausar com `P` ou `Esc`. |
| **Celular** | Arrastar o dedo sobre a tela do jogo ou utilizar os botões `◀` `▶`. |

### Regras de Pontuação

* **Saúde Inicial da Lagoa:** 100 pontos (A partida encerra quando chega a 0).

| Item | Pontos ao Coletar | Dano à Lagoa (se cair / se coletar) |
| :--- | :---: | :---: |
| Copo plástico, Sacola, Lata, Garrafa de vidro | +10 | −10 |
| Bituca de cigarro | +15 | −10 |
| Pneu | +15 | −15 |
| Peixe / Tartaruga *(Não recolher!)* | — | −12 *(se for recolhido)* |

Além disso:

- Resíduos que tocam a água reduzem a saúde da lagoa e deixam a água mais turva.
- Peixes e tartarugas que pulam da água **não** devem ser recolhidos.
- Sequências de acertos aumentam o multiplicador (até x3) e curam a lagoa.
- A cada 200 pontos o nível sobe e o jogo acelera.

---

## 3. Arquitetura e Estrutura

O projeto utiliza uma arquitetura cliente-servidor leve:

- **Servidor (Flask):** Gerencia autenticação, renderização de templates, sessão, acesso ao banco e validação de pontuação.
- **Cliente (Navegador):** O jogo roda via JavaScript utilizando a API Canvas 2D.

### Estrutura de Pastas

```text
guardioes-da-lagoa/
├── app.py                # Aplicação Flask: rotas, segurança e API da partida
├── database.py           # Conexão SQLite, criação de tabelas e consultas
├── requirements.txt      # Dependências Python (Flask)
├── templates/            # Páginas HTML (Jinja2)
│   ├── base.html         #   Layout base
│   ├── index.html        #   Página inicial e instruções
│   ├── cadastro.html     #   Criação de conta
│   ├── login.html        #   Autenticação
│   ├── jogo.html         #   Tela da partida (Canvas)
│   └── ranking.html      #   Classificação geral
├── static/
│   ├── css/style.css     # Estilos responsivos
│   ├── js/game.js        # Lógica do jogo e renderização (Canvas 2D)
│   └── img/              # Assets de imagem
├── instance/             # Banco SQLite e chave secreta locais (ignorado no Git)
├── README.md             # Documentação do projeto
├── .gitignore            # Arquivos locais e sensíveis ignorados
└── .env.example          # Exemplo de variáveis de ambiente (se aplicável)
```

### Fluxo de uma Partida

1. O jogador clica em **Começar**; o cliente faz um `POST /api/partida/iniciar` e o servidor grava o horário inicial na sessão.
2. O jogo é executado no navegador (Canvas 2D).
3. Ao zerar a saúde da lagoa, o cliente envia a pontuação e o tempo decorrido via `POST /api/partida/finalizar`.
4. O servidor valida a coerência do tempo e da pontuação, calcula o nível e grava a partida no banco.
5. A tela `/ranking` exibe o recorde de cada usuário.

### Modelo de Dados

```sql
-- Tabela de Usuários
usuarios (
    id INTEGER PRIMARY KEY,
    nome TEXT,
    usuario TEXT UNIQUE, -- Case-insensitive
    senha TEXT,          -- Hash de segurança
    criado_em DATETIME
);

-- Tabela de Partidas
partidas (
    id INTEGER PRIMARY KEY,
    usuario_id INTEGER FOREIGN KEY,
    pontos INTEGER,
    nivel INTEGER,
    tempo INTEGER,
    criado_em DATETIME
);
```

Além disso, o ranking mostra a melhor partida de cada jogador.

---

## 4. Tecnologias e IA

| Camada | Tecnologia / Biblioteca | Uso |
| :--- | :--- | :--- |
| **Back-end** | Python 3 + Flask (≥ 3.0) | Rotas, sessões, API e regras do servidor |
| **Banco de Dados** | SQLite3 | Persistência local de dados sem servidor externo |
| **Segurança** | Werkzeug | Criptografia/hash de senhas |
| **Templates** | Jinja2 | Renderização dinâmica das páginas |
| **Front-end** | HTML5 + CSS3 | Interface responsiva |
| **Game Engine** | JavaScript Vanilla + Canvas 2D | Lógica e renderização do jogo sem frameworks pesados |
| **Controle de Versão** | Git / GitHub | Gestão de código e repositório |

### Ferramentas de IA Utilizadas

- **Claude:** Auxílio no desenvolvimento do código, revisão de regras de validação no back-end e estrutura da documentação.
- **ChatGPT / Copilot:** Sugestões de trechos de código e depuração de erros.
- **Google Imagens:** Referências para a identidade visual do projeto.

---

## 5. Como Executar

### Pré-requisitos

- Python 3.9 ou superior (`python --version`)
- Gerenciador de pacotes `pip`
- Navegador moderno (Chrome, Firefox, Edge, Safari)

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone <URL-DO-REPOSITORIO>
   cd guardioes-da-lagoa
   ```

2. **Criar e ativar o ambiente virtual:**
   - Linux / macOS:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - Windows (PowerShell):
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```

3. **Instalar dependências:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Executar a aplicação:**
   ```bash
   python app.py
   ```

5. **Acessar no navegador:**
   Abra `http://127.0.0.1:5000`

### Jogar pelo Celular (Wi-Fi Local)

Para testar em dispositivos móveis conectados à mesma rede Wi-Fi:

```bash
flask --app app run --host 0.0.0.0
```

Em seguida, acesse pelo celular no endereço: `http://<IP-DO-SEU-COMPUTADOR>:5000`

### Variáveis de Ambiente

| Variável | Descrição |
| :--- | :--- |
| `SECRET_KEY` | Chave de sessão. Se ausente, uma é gerada automaticamente em `instance/secret_key.txt`. |
| `FLASK_DEBUG=1` | Ativa o modo de desenvolvimento com auto-reload. |
| `COOKIE_SEGURO=1` | Habilita a flag `Secure` nos cookies (requer HTTPS). |

### Troubleshooting

- **`python` não reconhecido:** Tente usar `python3` (Linux/macOS) ou `py` (Windows).
- **Erro de permissão no PowerShell:** Execute `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` no PowerShell como Administrador.
- **Porta 5000 em uso:** Execute usando outra porta:
  ```bash
  flask --app app run --port 5001
  ```
- **Resetar banco de dados:** Pare a aplicação e exclua o arquivo `instance/guardioes.db`.

---

## 6. Detalhes Técnicos e Segurança

- **Proteção de Senhas e SQL Injection:** Uso de hash seguro via `Werkzeug` e consultas SQL 100% parametrizadas.
- **Proteção CSRF:** Validação de tokens de sessão tanto nos formulários HTML quanto nas chamadas de API via cabeçalho `X-CSRF-Token`.
- **Proteção Contra Brute-Force:** Limite de 8 tentativas de login por IP em intervalos de 5 minutos e mensagens de erro genéricas na autenticação.
- **Cookies e Cabeçalhos:** Configuração de cookies com `HttpOnly` e `SameSite=Lax`, além de cabeçalhos de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) e limitação de payload (máx. 16 KB).
- **Validação Server-Side da Pontuação:**
  - A partida precisa ser explicitamente iniciada antes do envio da pontuação.
  - Validação do tempo de jogo (o tempo informado pelo cliente não pode superar o tempo real de sessão com margem superior a 3s).
  - Teto máximo aceitável de taxa de pontos por segundo (~120 pts/s).
  - O nível é recalculado exclusivamente pelo servidor (`1 + pontos // 200`).

### Limitações Conhecidas

1. **Rate Limiting em Memória:** A contagem de tentativas de login é reiniciada caso o servidor seja reiniciado e não é compartilhada em ambientes multi-processo.
2. **Servidor de Desenvolvimento:** O servidor embutido do Flask destina-se apenas para testes. Para ambiente de produção, recomenda-se uso de um servidor WSGI (ex.: Gunicorn) sob HTTPS.

A pasta `instance/` guarda o banco (`guardioes.db`) e a chave secreta gerada automaticamente (`secret_key.txt`). Ela não vai para o GitHub (veja `.gitignore`).

### Banco de Dados

- `usuarios`: id, nome, usuario, senha (hash), criado_em
- `partidas`: id, usuario_id, pontos, nivel, tempo, criado_em

### Segurança

- Senhas com hash (Werkzeug) e consultas SQL parametrizadas.
- Proteção CSRF nos formulários e na API.
- Login com mensagem genérica e limite de tentativas por IP.
- Pontuação validada no servidor: a partida precisa ter sido iniciada, o tempo informado não pode passar do tempo real, a pontuação precisa caber no tempo jogado e o nível é calculado pelo servidor.

Como o jogo roda no navegador, nenhuma validação elimina 100% das fraudes, mas as regras acima barram valores impossíveis.

---

## 7. Divisão da Equipe

| Integrante | Responsabilidades |
| :--- | :--- |
| **João Pedro Alves de Souza** | Lógica do jogo, mecânicas e propostas de gameplay. |
| **Jean Pierre Rodrigues** | Back-end em Flask, banco de dados e arquitetura de segurança. |
| **Joao Pedro Pereira Bronisio** | Interface do usuário (HTML/CSS), responsividade, identidade visual e HUD. |
| **Ana Victoria** | Pesquisa, conteúdo educativo, testes de usabilidade e apresentação. |
| **Dayany Sales Pires** | Fullstack, validação de dados no servidor e documentação. |

---

## ✅ Resumo do Projeto

O **Guardiões da Lagoa de Maricá** combina entretenimento, educação ambiental e competitividade saudável em uma experiência web simples e acessível. O objetivo é fazer as pessoas aprenderem, por meio da ação e da reflexão, como pequenos gestos e a conscientização coletiva podem proteger lagoas, fauna e comunidade local.
