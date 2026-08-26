// ===== IMPORTAÇÃO DO FIREBASE =====
// Como usamos <script type="module">, dá pra "importar" pedaços do Firebase
// direto de um link, sem precisar instalar nada.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  update,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

// Essas informações não são secretas — elas só dizem "qual projeto" usar.
// A segurança de verdade vem das REGRAS do banco, configuradas no console.
const firebaseConfig = {
  apiKey: "AIzaSyBjBGJe2wTknZe0X6cObfwzT3N0v2Ojqk8",
  authDomain: "mcbe-4974f.firebaseapp.com",
  databaseURL: "https://mcbe-4974f-default-rtdb.firebaseio.com",
  projectId: "mcbe-4974f",
  storageBucket: "mcbe-4974f.firebasestorage.app",
  messagingSenderId: "399816362024",
  appId: "1:399816362024:web:48938982545f61a4f6cd1d",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== ELEMENTOS DA PÁGINA =====
const grid = document.getElementById("grid-addons");
const contador = document.getElementById("contador");
const campoBusca = document.getElementById("campo-busca");
const botoesFiltro = document.querySelectorAll(".filtro-btn");

const fab = document.getElementById("fab-admin");

const modalChaveOverlay = document.getElementById("modal-chave-overlay");
const formChave = document.getElementById("form-chave");
const btnFecharChave = document.getElementById("btn-fechar-chave");
const mensagemErroChave = document.getElementById("mensagem-erro-chave");

const modalOverlay = document.getElementById("modal-overlay");
const btnFechar = document.getElementById("btn-fechar-modal");
const formAddon = document.getElementById("form-addon");
const mensagemErro = document.getElementById("mensagem-erro");

// A chave fica guardada aqui em memória (e também no sessionStorage,
// pra continuar "destravado" enquanto a aba estiver aberta).
let chaveArmazenada = sessionStorage.getItem("chaveAdmin") || null;

// Deixa o botão flutuante com a carinha certa: 🔑 se ainda não destravou,
// + se já destravou.
function atualizarBotaoFab() {
  if (chaveArmazenada) {
    fab.textContent = "+";
    fab.title = "Cadastrar addon";
  } else {
    fab.textContent = "🔑";
    fab.title = "Acesso administrativo";
  }
}
atualizarBotaoFab();

let todosAddons = [];
let categoriaAtual = "todos";

// ===== DESENHAR OS CARDS NA TELA =====
function renderizarAddons(lista) {
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `<p class="vazio">Nenhum addon encontrado.</p>`;
    contador.textContent = "0 addons";
    return;
  }

  lista.forEach((addon) => {
    const preview = addon.preview || addon.imagem;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-imagem-wrap">
        <img class="card-imagem-estatica" src="${addon.imagem}" alt="${addon.nome}" />
        <img class="card-imagem-preview" src="${preview}" alt="${addon.nome} - preview" />
      </div>
      <div class="card-corpo">
        <span class="card-categoria">${addon.categoria}</span>
        <h3 class="card-titulo">${addon.nome}</h3>
        <p class="card-descricao">${addon.descricao}</p>
        ${addon.criador ? `<span class="card-criador">por ${addon.criador}</span>` : ""}
        <a class="card-baixar" href="${addon.link}" target="_blank">Baixar</a>
      </div>
    `;
    grid.appendChild(card);
  });

  contador.textContent = `${lista.length} addons`;
}

// ===== BUSCA + FILTRO =====
function aplicarFiltros() {
  const termo = campoBusca.value.trim().toLowerCase();

  const resultado = todosAddons.filter((addon) => {
    const bateCategoria =
      categoriaAtual === "todos" || addon.categoria === categoriaAtual;
    const bateBusca = addon.nome.toLowerCase().includes(termo);
    return bateCategoria && bateBusca;
  });

  renderizarAddons(resultado);
}

campoBusca.addEventListener("input", aplicarFiltros);

botoesFiltro.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesFiltro.forEach((b) => b.classList.remove("ativo"));
    botao.classList.add("ativo");
    categoriaAtual = botao.dataset.categoria;
    aplicarFiltros();
  });
});

// ===== LER OS ADDONS DO BANCO, EM TEMPO REAL =====
// onValue "escuta" o caminho "addons" pra sempre: toda vez que algo muda
// no banco (um addon novo, por exemplo), essa função roda de novo sozinha.
const addonsRef = ref(db, "addons");
onValue(addonsRef, (snapshot) => {
  const dados = snapshot.val() || {};
  // O banco guarda os addons como um objeto { id1: {...}, id2: {...} }.
  // Transformamos isso numa lista, que é o formato que já sabemos usar.
  todosAddons = Object.values(dados);
  aplicarFiltros();
});

// ===== BOTÃO FLUTUANTE: decide qual modal abrir =====
fab.addEventListener("click", () => {
  if (chaveArmazenada) {
    mensagemErro.textContent = "";
    modalOverlay.classList.add("aberto");
  } else {
    mensagemErroChave.textContent = "";
    modalChaveOverlay.classList.add("aberto");
  }
});

btnFecharChave.addEventListener("click", () => {
  modalChaveOverlay.classList.remove("aberto");
});

modalChaveOverlay.addEventListener("click", (evento) => {
  if (evento.target === modalChaveOverlay) {
    modalChaveOverlay.classList.remove("aberto");
  }
});

btnFechar.addEventListener("click", () => {
  modalOverlay.classList.remove("aberto");
});

modalOverlay.addEventListener("click", (evento) => {
  if (evento.target === modalOverlay) {
    modalOverlay.classList.remove("aberto");
  }
});

// ===== ENVIAR A CHAVE (só "destrava" a interface — a validação =====
// ===== de verdade acontece no banco, na hora de cadastrar) =====
formChave.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const chaveDigitada = new FormData(formChave).get("chave").trim();

  chaveArmazenada = chaveDigitada;
  sessionStorage.setItem("chaveAdmin", chaveArmazenada);
  atualizarBotaoFab();

  formChave.reset();
  modalChaveOverlay.classList.remove("aberto");

  // Já abre direto o formulário de cadastro, pra não precisar clicar de novo.
  mensagemErro.textContent = "";
  modalOverlay.classList.add("aberto");
});

// ===== ENVIAR O FORMULÁRIO DE CADASTRO =====
formAddon.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagemErro.textContent = "";

  const dados = new FormData(formAddon);

  const novoAddon = {
    nome: dados.get("nome").trim(),
    descricao: dados.get("descricao").trim(),
    criador: dados.get("criador").trim(),
    categoria: dados.get("categoria"),
    imagem: dados.get("capa").trim(),
    preview: dados.get("preview").trim(),
    link: dados.get("link").trim(),
  };

  // Cria uma referência com um ID único, mas ainda não grava nada.
  const novaRef = push(ref(db, "addons"));
  const id = novaRef.key;

  // Gravamos o addon E a chave guardada ao mesmo tempo, em dois lugares
  // diferentes do banco. As regras de segurança comparam essa chave com
  // a chave verdadeira guardada em config/chave antes de aceitar a gravação.
  const atualizacoes = {};
  atualizacoes[`addons/${id}`] = novoAddon;
  atualizacoes[`gatekeeper/${id}`] = chaveArmazenada;

  try {
    await update(ref(db), atualizacoes);
    formAddon.reset();
    modalOverlay.classList.remove("aberto");
  } catch (erro) {
    // A chave que estava guardada não é válida de verdade (o Firebase
    // recusou a gravação) — volta pro estado "trancado" e pede de novo.
    mensagemErro.textContent =
      "Chave inválida — o acesso foi revogado, digite a chave correta.";
    sessionStorage.removeItem("chaveAdmin");
    chaveArmazenada = null;
    atualizarBotaoFab();
    console.error(erro);
  }
});
```[cite: 5]