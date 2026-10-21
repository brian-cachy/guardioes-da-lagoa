/* Guardiões da Lagoa de Maricá
 * Jogo em Canvas: recolha os resíduos antes que toquem a água
 * e deixe os animais da lagoa em paz.
 */
(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Configuração (PONTOS_POR_NIVEL deve bater com app.py)
  // ------------------------------------------------------------------
  var CONFIG = {
    LARGURA: 480,
    ALTURA: 640,
    NIVEL_AGUA: 560,          // y onde começa a água
    BARCO_LARGURA: 96,
    BARCO_VEL: 440,           // px/s com teclado
    PONTOS_POR_NIVEL: 200,
    SAUDE_INICIAL: 100,
    DANO_PADRAO: 10,
    DANO_FAUNA: 12,
    CURA_SEQUENCIA: 5,        // a cada 10 seguidos
    SPAWN_INICIAL: 1.25,      // s entre itens no nível 1
    SPAWN_MINIMO: 0.55,
    CHANCE_FAUNA: 0.13,       // a partir do nível 2
    GRAVIDADE_FAUNA: 900,
    MAX_BOIANDO: 14
  };

  var RESIDUOS = [
    { emoji: "🥤", nome: "copo plástico", pontos: 10, dano: 10,
      fato: "O plástico pode levar centenas de anos para se degradar e vira microplástico, que peixes confundem com alimento." },
    { emoji: "🛍️", nome: "sacola", pontos: 10, dano: 10,
      fato: "Sacolas plásticas flutuam e podem ser confundidas com alimento por tartarugas e aves." },
    { emoji: "🥫", nome: "lata", pontos: 10, dano: 10,
      fato: "Latas de alumínio podem ser recicladas muitas vezes. Na água, poluem e podem ferir os animais." },
    { emoji: "🍾", nome: "garrafa de vidro", pontos: 10, dano: 10,
      fato: "Vidro quebrado fere pessoas e animais. Descartado certo, ele pode ser reciclado." },
    { emoji: "🚬", nome: "bituca de cigarro", pontos: 15, dano: 10,
      fato: "Bitucas de cigarro soltam substâncias tóxicas que contaminam a água." },
    { emoji: "🛞", nome: "pneu", pontos: 15, dano: 15,
      fato: "Pneus acumulam água parada, que favorece criadouros de mosquitos, como o da dengue." }
  ];

  var FAUNA = [
    { emoji: "🐟", nome: "peixe" },
    { emoji: "🐢", nome: "tartaruga" }
  ];

  var DICAS_FINAIS = [
    "Resíduos jogados na rua podem ser levados pela chuva até rios e lagoas.",
    "Separar o lixo reciclável ajuda a reduzir o que chega aos corpos d'água.",
    "Menos descartáveis no dia a dia significa menos lixo para acabar na natureza.",
    "Lagoas e manguezais abrigam peixes, aves e caranguejos que dependem de água limpa.",
    "Um gesto simples: nunca descarte lixo na areia, na calçada ou perto de canais."
  ];

  // ------------------------------------------------------------------
  // Elementos da página
  // ------------------------------------------------------------------
  var canvas = document.getElementById("areaJogo");
  if (!canvas) { return; }
  var ctx = canvas.getContext("2d");

  function $(id) { return document.getElementById(id); }

  var el = {
    pontos: $("hudPontos"),
    nivel: $("hudNivel"),
    tempo: $("hudTempo"),
    sequencia: $("hudSequencia"),
    multiplicador: $("hudMultiplicador"),
    barraSaude: $("barraSaude"),
    textoSaude: $("textoSaude"),
    aviso: $("aviso"),
    telaInicio: $("telaInicio"),
    telaFim: $("telaFim"),
    fimPontos: $("fimPontos"),
    fimNivel: $("fimNivel"),
    fimTempo: $("fimTempo"),
    fimStatus: $("fimStatus"),
    fimDica: $("fimDica"),
    botaoComecar: $("botaoComecar"),
    botaoReiniciar: $("botaoReiniciar"),
    botaoPausa: $("botaoPausa"),
    botaoEsquerda: $("botaoEsquerda"),
    botaoDireita: $("botaoDireita")
  };

  var sessao = window.GAME_SESSION || {};

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  var estado = {
    rodando: false,
    pausado: false,
    pontos: 0,
    nivel: 1,
    saude: CONFIG.SAUDE_INICIAL,
    sequencia: 0,
    tempo: 0,
    itens: [],
    efeitos: [],
    boiando: [],
    spawn: 0,
    barcoX: CONFIG.LARGURA / 2,
    alvoX: null,
    esq: false,
    dir: false,
    vistos: {},
    relogio: 0,
    avisoTimer: 0
  };

  var ultimoQuadro = 0;

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  function aleatorio(a, b) { return a + Math.random() * (b - a); }
  function limitar(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function escolher(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  function mistura(a, b, t) { return Math.round(a + (b - a) * t); }

  function nivelPorPontos(pontos) {
    return 1 + Math.floor(pontos / CONFIG.PONTOS_POR_NIVEL);
  }

  function multiplicadorAtual() {
    return Math.min(3, 1 + Math.floor(estado.sequencia / 5) * 0.5);
  }

  function rotuloSaude(s) {
    if (s >= 70) { return "Saudável"; }
    if (s >= 40) { return "Em alerta"; }
    return "Crítica";
  }

  function estadoSaude(s) {
    if (s >= 70) { return "boa"; }
    if (s >= 40) { return "alerta"; }
    return "critica";
  }

  // ------------------------------------------------------------------
  // Avisos educativos
  // ------------------------------------------------------------------
  function mostrarAviso(texto, tipo) {
    el.aviso.textContent = texto;
    el.aviso.className = "aviso" + (tipo ? " " + tipo : "");
    estado.avisoTimer = 5;
  }

  function limparAviso() {
    el.aviso.textContent = "";
    el.aviso.className = "aviso";
    estado.avisoTimer = 0;
  }

  // ------------------------------------------------------------------
  // Tamanho do canvas (nítido em telas de alta densidade)
  // ------------------------------------------------------------------
  function ajustarCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var largura = canvas.clientWidth || CONFIG.LARGURA;
    var escala = largura / CONFIG.LARGURA;
    canvas.width = Math.round(CONFIG.LARGURA * escala * dpr);
    canvas.height = Math.round(CONFIG.ALTURA * escala * dpr);
    ctx.setTransform(canvas.width / CONFIG.LARGURA, 0, 0, canvas.height / CONFIG.ALTURA, 0, 0);
  }

  // ------------------------------------------------------------------
  // Controle da partida
  // ------------------------------------------------------------------
  function resetar() {
    estado.pontos = 0;
    estado.nivel = 1;
    estado.saude = CONFIG.SAUDE_INICIAL;
    estado.sequencia = 0;
    estado.tempo = 0;
    estado.itens = [];
    estado.efeitos = [];
    estado.boiando = [];
    estado.spawn = 0.6;
    estado.barcoX = CONFIG.LARGURA / 2;
    estado.alvoX = null;
    estado.vistos = {};
    estado.pausado = false;
    el.botaoPausa.textContent = "⏸ Pausar";
    limparAviso();
    atualizarHud();
  }

  function pedirInicioNoServidor() {
    if (!sessao.usuarioLogado) { return Promise.resolve(false); }
    return fetch("/api/partida/iniciar", {
      method: "POST",
      headers: { "X-CSRF-Token": sessao.csrf }
    })
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  function iniciarPartida() {
    el.botaoComecar.disabled = true;
    el.botaoReiniciar.disabled = true;

    pedirInicioNoServidor().then(function (ok) {
      el.botaoComecar.disabled = false;
      el.botaoReiniciar.disabled = false;

      resetar();
      el.telaInicio.hidden = true;
      el.telaFim.hidden = true;
      el.botaoPausa.disabled = false;
      estado.rodando = true;

      if (!ok) {
        mostrarAviso("Não foi possível iniciar o registro desta partida. Você pode jogar, mas a pontuação pode não entrar no ranking.", "erro");
      } else {
        mostrarAviso("Boa sorte! Recolha os resíduos e deixe peixes e tartarugas voltarem à água.", "fato");
      }
    });
  }

  function alternarPausa() {
    if (!estado.rodando) { return; }
    estado.pausado = !estado.pausado;
    el.botaoPausa.textContent = estado.pausado ? "▶ Continuar" : "⏸ Pausar";
    if (estado.pausado) {
      estado.esq = false;
      estado.dir = false;
    }
  }

  function terminarPartida() {
    estado.rodando = false;
    estado.pausado = false;
    el.botaoPausa.disabled = true;
    el.botaoPausa.textContent = "⏸ Pausar";

    var tempoFinal = Math.floor(estado.tempo);
    el.fimPontos.textContent = estado.pontos;
    el.fimNivel.textContent = estado.nivel;
    el.fimTempo.textContent = tempoFinal;
    el.fimDica.textContent = "Você sabia? " + escolher(DICAS_FINAIS);
    el.fimStatus.className = "status-salvo";
    el.fimStatus.textContent = "";
    el.telaFim.hidden = false;
    el.botaoReiniciar.focus();

    if (!sessao.usuarioLogado) { return; }

    el.fimStatus.textContent = "Salvando pontuação...";

    fetch("/api/partida/finalizar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": sessao.csrf
      },
      body: JSON.stringify({
        pontos: estado.pontos,
        nivel: estado.nivel,
        tempo: tempoFinal
      })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (dados) {
          if (res.ok && dados.ok) {
            el.fimStatus.textContent = "Pontuação salva no ranking.";
          } else {
            el.fimStatus.className = "status-salvo erro";
            el.fimStatus.textContent = dados.erro || "Não foi possível salvar a pontuação.";
          }
        });
      })
      .catch(function (err) {
        console.error("Falha ao enviar partida:", err);
        el.fimStatus.className = "status-salvo erro";
        el.fimStatus.textContent = "Sem conexão: a pontuação não foi salva.";
      });
  }

  // ------------------------------------------------------------------
  // Itens
  // ------------------------------------------------------------------
  function criarItem() {
    var fauna = estado.nivel >= 2 && Math.random() < CONFIG.CHANCE_FAUNA;

    if (fauna) {
      var tipoF = escolher(FAUNA);
      var altura = aleatorio(200, 340);
      return {
        fauna: true,
        tipo: tipoF,
        x: aleatorio(50, CONFIG.LARGURA - 50),
        y: CONFIG.NIVEL_AGUA,
        vx: aleatorio(-40, 40),
        vy: -Math.sqrt(2 * CONFIG.GRAVIDADE_FAUNA * altura),
        raio: 18,
        rot: 0,
        vrot: 0
      };
    }

    var tipo = escolher(RESIDUOS);
    var velocidade = Math.min(330, 95 + estado.nivel * 20) * aleatorio(0.9, 1.15);
    return {
      fauna: false,
      tipo: tipo,
      x: aleatorio(30, CONFIG.LARGURA - 30),
      y: -24,
      vx: 0,
      vy: velocidade,
      balanco: aleatorio(0, Math.PI * 2),
      raio: 18,
      rot: aleatorio(0, Math.PI * 2),
      vrot: aleatorio(-2, 2)
    };
  }

  function intervaloSpawn() {
    return Math.max(CONFIG.SPAWN_MINIMO, CONFIG.SPAWN_INICIAL - 0.08 * (estado.nivel - 1));
  }

  // ------------------------------------------------------------------
  // Efeitos visuais
  // ------------------------------------------------------------------
  function efeitoTexto(x, y, texto, cor) {
    estado.efeitos.push({ tipo: "texto", x: x, y: y, texto: texto, cor: cor, vida: 0.9, total: 0.9 });
  }

  function efeitoRespingo(x) {
    estado.efeitos.push({ tipo: "anel", x: x, y: CONFIG.NIVEL_AGUA + 4, r: 4, vida: 0.7, total: 0.7 });
  }

  // ------------------------------------------------------------------
  // Regras
  // ------------------------------------------------------------------
  function atualizarNivel() {
    var novo = nivelPorPontos(estado.pontos);
    if (novo > estado.nivel) {
      estado.nivel = novo;
      mostrarAviso("Nível " + novo + "! Os resíduos estão caindo mais rápido.", "bom");
    }
  }

  function recolheuResiduo(item) {
    estado.sequencia += 1;
    var mult = multiplicadorAtual();
    var ganho = Math.round(item.tipo.pontos * mult);
    estado.pontos += ganho;
    efeitoTexto(item.x, CONFIG.NIVEL_AGUA - 60, "+" + ganho, "#ffffff");

    if (estado.sequencia % 10 === 0) {
      estado.saude = Math.min(100, estado.saude + CONFIG.CURA_SEQUENCIA);
      mostrarAviso("Sequência de " + estado.sequencia + "! A lagoa se recupera um pouco.", "bom");
    } else if (!estado.vistos[item.tipo.nome]) {
      estado.vistos[item.tipo.nome] = true;
      mostrarAviso("Você recolheu: " + item.tipo.nome + ". " + item.tipo.fato, "fato");
    }

    atualizarNivel();
  }

  function recolheuFauna(item) {
    estado.sequencia = 0;
    estado.saude = Math.max(0, estado.saude - CONFIG.DANO_FAUNA);
    estado.pontos = Math.max(0, estado.pontos - 15);
    efeitoTexto(item.x, CONFIG.NIVEL_AGUA - 60, "-15", "#ffb3ad");
    mostrarAviso("Ops, era um(a) " + item.tipo.nome + "! Os animais da lagoa devem voltar para a água.", "erro");
  }

  function residuoCaiuNaAgua(item) {
    estado.sequencia = 0;
    estado.saude = Math.max(0, estado.saude - item.tipo.dano);
    efeitoRespingo(item.x);

    estado.boiando.push({
      emoji: item.tipo.emoji,
      x: limitar(item.x, 20, CONFIG.LARGURA - 20),
      fase: aleatorio(0, Math.PI * 2)
    });
    if (estado.boiando.length > CONFIG.MAX_BOIANDO) { estado.boiando.shift(); }

    mostrarAviso("Caiu na lagoa: " + item.tipo.nome + ". " + item.tipo.fato, "erro");
  }

  // ------------------------------------------------------------------
  // Atualização
  // ------------------------------------------------------------------
  function atualizar(dt) {
    estado.tempo += dt;

    // Barco
    var meia = CONFIG.BARCO_LARGURA / 2;
    if (estado.esq || estado.dir) {
      estado.alvoX = null;
      estado.barcoX += ((estado.dir ? 1 : 0) - (estado.esq ? 1 : 0)) * CONFIG.BARCO_VEL * dt;
    } else if (estado.alvoX !== null) {
      estado.barcoX += (estado.alvoX - estado.barcoX) * Math.min(1, 14 * dt);
    }
    estado.barcoX = limitar(estado.barcoX, meia, CONFIG.LARGURA - meia);

    // Novos itens
    estado.spawn -= dt;
    if (estado.spawn <= 0) {
      estado.itens.push(criarItem());
      estado.spawn = intervaloSpawn() * aleatorio(0.8, 1.2);
    }

    // Itens
    var zonaTopo = CONFIG.NIVEL_AGUA - 56;
    var restantes = [];

    for (var i = 0; i < estado.itens.length; i++) {
      var it = estado.itens[i];
      var some = false;

      if (it.fauna) {
        it.vy += CONFIG.GRAVIDADE_FAUNA * dt;
        it.y += it.vy * dt;
        it.x += it.vx * dt;
        it.rot = Math.atan2(it.vy, it.vx || 1) * 0.25;
        if (it.x < 20 || it.x > CONFIG.LARGURA - 20) { it.vx = -it.vx; }

        if (it.vy > 0 && it.y >= CONFIG.NIVEL_AGUA) {
          efeitoRespingo(it.x);
          some = true;
        }
      } else {
        it.y += it.vy * dt;
        it.balanco += dt * 2;
        it.x += Math.sin(it.balanco) * 18 * dt;
        it.rot += it.vrot * dt;
      }

      if (!some) {
        var dentroX = Math.abs(it.x - estado.barcoX) < meia + 6;
        var dentroY = it.y + it.raio >= zonaTopo && it.y - it.raio <= CONFIG.NIVEL_AGUA - 10;

        if (dentroX && dentroY) {
          if (it.fauna) { recolheuFauna(it); } else { recolheuResiduo(it); }
          some = true;
        } else if (!it.fauna && it.y + it.raio * 0.5 >= CONFIG.NIVEL_AGUA) {
          residuoCaiuNaAgua(it);
          some = true;
        }
      }

      if (!some) { restantes.push(it); }
    }
    estado.itens = restantes;

    // Efeitos
    var efeitosVivos = [];
    for (var j = 0; j < estado.efeitos.length; j++) {
      var ef = estado.efeitos[j];
      ef.vida -= dt;
      if (ef.tipo === "texto") { ef.y -= 40 * dt; }
      if (ef.tipo === "anel") { ef.r += 60 * dt; }
      if (ef.vida > 0) { efeitosVivos.push(ef); }
    }
    estado.efeitos = efeitosVivos;

    // Aviso some depois de um tempo
    if (estado.avisoTimer > 0) {
      estado.avisoTimer -= dt;
      if (estado.avisoTimer <= 0) { limparAviso(); }
    }

    atualizarHud();

    if (estado.saude <= 0) { terminarPartida(); }
  }

  function atualizarHud() {
    el.pontos.textContent = estado.pontos;
    el.nivel.textContent = estado.nivel;
    el.tempo.textContent = Math.floor(estado.tempo);
    el.sequencia.textContent = estado.sequencia;
    el.multiplicador.textContent = "x" + multiplicadorAtual();

    var s = Math.round(estado.saude);
    el.barraSaude.style.width = s + "%";
    el.barraSaude.setAttribute("aria-valuenow", s);
    el.barraSaude.setAttribute("data-estado", estadoSaude(s));
    el.textoSaude.textContent = s + " - " + rotuloSaude(s);
  }

  // ------------------------------------------------------------------
  // Desenho
  // ------------------------------------------------------------------
  function desenharCenario() {
    var W = CONFIG.LARGURA;
    var H = CONFIG.ALTURA;
    var Y = CONFIG.NIVEL_AGUA;

    // Céu
    var ceu = ctx.createLinearGradient(0, 0, 0, Y);
    ceu.addColorStop(0, "#9fd8e8");
    ceu.addColorStop(1, "#e6f6ee");
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, W, Y);

    // Sol
    ctx.fillStyle = "rgba(255, 224, 140, 0.9)";
    ctx.beginPath();
    ctx.arc(390, 110, 38, 0, Math.PI * 2);
    ctx.fill();

    // Morros ao fundo
    ctx.fillStyle = "#7fb48f";
    ctx.beginPath();
    ctx.moveTo(0, Y);
    ctx.lineTo(0, Y - 70);
    ctx.quadraticCurveTo(90, Y - 130, 190, Y - 60);
    ctx.quadraticCurveTo(290, Y - 120, 380, Y - 55);
    ctx.quadraticCurveTo(440, Y - 90, W, Y - 50);
    ctx.lineTo(W, Y);
    ctx.closePath();
    ctx.fill();

    // Mangue na margem
    ctx.fillStyle = "#2f6b3a";
    ctx.beginPath();
    ctx.moveTo(0, Y);
    ctx.lineTo(0, Y - 28);
    ctx.quadraticCurveTo(40, Y - 48, 90, Y - 24);
    ctx.quadraticCurveTo(150, Y - 42, 210, Y - 20);
    ctx.quadraticCurveTo(300, Y - 40, 370, Y - 20);
    ctx.quadraticCurveTo(430, Y - 44, W, Y - 22);
    ctx.lineTo(W, Y);
    ctx.closePath();
    ctx.fill();

    // Água: do azul-esverdeado ao barrento, conforme a saúde
    var t = 1 - limitar(estado.saude / 100, 0, 1);
    var topo = "rgb(" + mistura(42, 124, t) + "," + mistura(163, 112, t) + "," + mistura(168, 70, t) + ")";
    var fundo = "rgb(" + mistura(14, 80, t) + "," + mistura(80, 72, t) + "," + mistura(96, 48, t) + ")";
    var agua = ctx.createLinearGradient(0, Y, 0, H);
    agua.addColorStop(0, topo);
    agua.addColorStop(1, fundo);
    ctx.fillStyle = agua;
    ctx.fillRect(0, Y, W, H - Y);

    // Ondas
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    for (var linha = 0; linha < 3; linha++) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 8) {
        var y = Y + 6 + linha * 22 + Math.sin(x * 0.04 + estado.relogio * 2 + linha) * 3;
        if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }
  }

  function desenharEmoji(emoji, x, y, tamanho, rot) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) { ctx.rotate(rot); }
    ctx.font = tamanho + "px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  function desenharBoiando() {
    for (var i = 0; i < estado.boiando.length; i++) {
      var b = estado.boiando[i];
      var y = CONFIG.NIVEL_AGUA + 8 + Math.sin(estado.relogio * 2 + b.fase) * 3;
      desenharEmoji(b.emoji, b.x, y, 22, Math.sin(estado.relogio + b.fase) * 0.2);
    }
  }

  function desenharBarco() {
    var x = estado.barcoX;
    var w = CONFIG.BARCO_LARGURA;
    var y = CONFIG.NIVEL_AGUA - 6 + Math.sin(estado.relogio * 3) * 1.5;

    // Rede (cesto)
    var rx = x - w / 2 + 6;
    var rw = w - 12;
    var rt = y - 50;
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fillRect(rx, rt, rw, 44);
    ctx.strokeStyle = "#f5e6b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, rt, rw, 44);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 1; i < 5; i++) {
      ctx.moveTo(rx + (rw / 5) * i, rt);
      ctx.lineTo(rx + (rw / 5) * i, rt + 44);
    }
    for (var j = 1; j < 3; j++) {
      ctx.moveTo(rx, rt + 14.6 * j);
      ctx.lineTo(rx + rw, rt + 14.6 * j);
    }
    ctx.stroke();

    // Casco
    ctx.fillStyle = "#7a4a22";
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 8, y - 6);
    ctx.lineTo(x + w / 2 + 8, y - 6);
    ctx.lineTo(x + w / 2 - 8, y + 14);
    ctx.lineTo(x - w / 2 + 8, y + 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f2b441";
    ctx.fillRect(x - w / 2 - 6, y - 6, w + 12, 4);
  }

  function desenharItens() {
    for (var i = 0; i < estado.itens.length; i++) {
      var it = estado.itens[i];
      desenharEmoji(it.tipo.emoji, it.x, it.y, 34, it.rot);
    }
  }

  function desenharEfeitos() {
    for (var i = 0; i < estado.efeitos.length; i++) {
      var ef = estado.efeitos[i];
      var alfa = limitar(ef.vida / ef.total, 0, 1);
      ctx.globalAlpha = alfa;

      if (ef.tipo === "texto") {
        ctx.fillStyle = ef.cor;
        ctx.strokeStyle = "rgba(14, 59, 67, 0.8)";
        ctx.lineWidth = 3;
        ctx.font = "bold 22px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeText(ef.texto, ef.x, ef.y);
        ctx.fillText(ef.texto, ef.x, ef.y);
      } else {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ef.x, ef.y, ef.r, ef.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function desenharPausa() {
    ctx.fillStyle = "rgba(14, 59, 67, 0.65)";
    ctx.fillRect(0, 0, CONFIG.LARGURA, CONFIG.ALTURA);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Pausado", CONFIG.LARGURA / 2, CONFIG.ALTURA / 2 - 12);
    ctx.font = "18px 'Trebuchet MS', sans-serif";
    ctx.fillText("Pressione P ou use o botão para continuar", CONFIG.LARGURA / 2, CONFIG.ALTURA / 2 + 26);
  }

  function desenhar() {
    ctx.clearRect(0, 0, CONFIG.LARGURA, CONFIG.ALTURA);
    desenharCenario();
    desenharBoiando();
    desenharItens();
    desenharBarco();
    desenharEfeitos();
    if (estado.pausado) { desenharPausa(); }
  }

  // ------------------------------------------------------------------
  // Loop
  // ------------------------------------------------------------------
  function quadro(agora) {
    var dt = (agora - ultimoQuadro) / 1000;
    ultimoQuadro = agora;
    if (!(dt > 0)) { dt = 0; }
    if (dt > 0.05) { dt = 0.05; }

    estado.relogio += dt;

    if (estado.rodando && !estado.pausado) { atualizar(dt); }

    desenhar();
    window.requestAnimationFrame(quadro);
  }

  // ------------------------------------------------------------------
  // Controles
  // ------------------------------------------------------------------
  function xDoPonteiro(evento) {
    var rect = canvas.getBoundingClientRect();
    return ((evento.clientX - rect.left) / rect.width) * CONFIG.LARGURA;
  }

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }
    var tecla = e.code;

    if (tecla === "ArrowLeft" || tecla === "KeyA") {
      estado.esq = true;
      if (estado.rodando) { e.preventDefault(); }
    } else if (tecla === "ArrowRight" || tecla === "KeyD") {
      estado.dir = true;
      if (estado.rodando) { e.preventDefault(); }
    } else if ((tecla === "KeyP" || tecla === "Escape") && estado.rodando) {
      e.preventDefault();
      alternarPausa();
    }
  });

  document.addEventListener("keyup", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") { estado.esq = false; }
    if (e.code === "ArrowRight" || e.code === "KeyD") { estado.dir = false; }
  });

  window.addEventListener("blur", function () {
    estado.esq = false;
    estado.dir = false;
    if (estado.rodando && !estado.pausado) { alternarPausa(); }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && estado.rodando && !estado.pausado) { alternarPausa(); }
  });

  canvas.addEventListener("pointerdown", function (e) {
    if (!estado.rodando || estado.pausado) { return; }
    estado.alvoX = xDoPonteiro(e);
    if (canvas.setPointerCapture) { canvas.setPointerCapture(e.pointerId); }
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!estado.rodando || estado.pausado) { return; }
    // Mouse: segue o cursor; toque: só enquanto o dedo estiver na tela
    if (e.pointerType === "mouse" || e.buttons) { estado.alvoX = xDoPonteiro(e); }
  });

  function segurar(botao, lado) {
    function ligar(e) { e.preventDefault(); estado[lado] = true; }
    function desligar() { estado[lado] = false; }
    botao.addEventListener("pointerdown", ligar);
    botao.addEventListener("pointerup", desligar);
    botao.addEventListener("pointerleave", desligar);
    botao.addEventListener("pointercancel", desligar);
  }
  segurar(el.botaoEsquerda, "esq");
  segurar(el.botaoDireita, "dir");

  el.botaoComecar.addEventListener("click", iniciarPartida);
  el.botaoReiniciar.addEventListener("click", iniciarPartida);
  el.botaoPausa.addEventListener("click", alternarPausa);

  window.addEventListener("resize", ajustarCanvas);

  // ------------------------------------------------------------------
  // Início
  // ------------------------------------------------------------------
  ajustarCanvas();
  atualizarHud();
  window.requestAnimationFrame(function (t) {
    ultimoQuadro = t;
    quadro(t);
  });
})();
