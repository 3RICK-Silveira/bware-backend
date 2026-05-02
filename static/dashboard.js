// ☰ abrir/fechar menu
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.classList.toggle("active");
  }
}

// 🚪 logout
function logout() {
  localStorage.clear();
  window.location.href = "/";
}

// MODAIS
function abrirPedidos() {
  const modal = document.getElementById("pedidosModal");
  if (modal) {
    modal.classList.remove("hidden");
    carregarPedidos(); // 🔥 atualiza sempre que abrir
  }
}

function fecharPedidos() {
  const modal = document.getElementById("pedidosModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function abrirInfo() {
  const modal = document.getElementById("infoModal");

  if (modal) {
    modal.classList.remove("hidden");
    carregarInfo();
  }
}

function fecharInfo() {
  const modal = document.getElementById("infoModal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

//WHATSAPP
function falarWhatsApp(codigo) {
  if (!codigo) {
    alert("Erro ao identificar o pedido.");
    return;
  }

  const msg = encodeURIComponent(
    `Olá, acabei de fazer um pedido na BWare!\nCódigo: ${codigo}`
  );

  window.open(`https://wa.me/SEUNUMERO?text=${msg}`, "_blank");
}

//Listar Pedidos
async function carregarPedidos() {
  try {
    const email = localStorage.getItem("emailUsuario");
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (!email && !isAdmin) return;

    let url = `/pedidos?email=${email}`;

    if (isAdmin) {
      url = `/pedidos?admin=true`;
    }

    const response = await fetch(url);
    const pedidos = await response.json();

    const container = document.getElementById("listaPedidos");
    if (!container) return;

    container.innerHTML = "";

    // sem pedidos
    if (pedidos.length === 0) {
      container.innerHTML = `
        <p style="opacity:0.7;">
          Você ainda não tem pedidos.
        </p>
      `;
      return;
    }

    pedidos.forEach(p => {
      const isAdmin = localStorage.getItem("isAdmin") === "true";

      const codigo = p[0];
      const produto = p[1];
      const statusProducao = p[2];
      const statusPagamento = p[3];
      const whatsapp = p[4];
      const emailCliente = isAdmin ? p[5] : null;

      const div = document.createElement("div");
      div.classList.add("pedido-item");

      const statusClasse = statusProducao === "pronto"
        ? "status-pronto"
        : "status-producao";

      const pagamentoClasse = statusPagamento === "ativo"
        ? "status-ativo"
        : "status-inativo";

      div.innerHTML = `
        <strong>${produto}</strong>
        <p>Código: ${codigo}</p>

        ${isAdmin ? `<p>📧 Email: ${emailCliente}</p>` : ""}
        ${whatsapp ? `<p>📱 WhatsApp: ${whatsapp}</p>` : ""}

        <div class="status-row">
          <span class="status ${statusClasse}"></span>
          <small>Produção: ${statusProducao}</small>
        </div>

        <div class="status-row">
          <span class="status ${pagamentoClasse}"></span>
          <small>Pagamento: ${statusPagamento}</small>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (e) {
    console.error("Erro ao carregar pedidos:", e);
  }
}

//Carregar Info
function carregarInfo() {
  const nome = localStorage.getItem("nomeUsuario");
  const email = localStorage.getItem("emailUsuario");
  const cpf = localStorage.getItem("cpfUsuario");

  const container = document.getElementById("infoUsuario");
  if (!container) return;

  container.innerHTML = `
    <div class="info-item">
      <p><strong>Nome:</strong> ${nome || "Não informado"}</p>
      <p><strong>Email:</strong> ${email || "Não informado"}</p>
      <p><strong>CPF:</strong> ${cpf || "Não informado"}</p>
    </div>
  `;
}

// =============================
// 💳 COMPRA
// =============================
async function comprar(produto, preco) {
  const email = localStorage.getItem("emailUsuario");

  if (!email) {
    alert("Você precisa estar logado.");
    return;
  }

  try {
    const response = await fetch("/criar_pagamento", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        produto: produto,
        preco: preco,
        email: email
      })
    });

    const data = await response.json();

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      alert("Erro ao gerar pagamento.");
    }

  } catch (error) {
    console.error(error);
    alert("Erro de conexão.");
  }
}

// =============================
// 🎯 PORTFÓLIO SLIDER
// =============================
function getCurrentIndex(slides) {
  return Array.from(slides).findIndex(s => s.classList.contains("active"));
}

function nextSlide(btn) {
  const card = btn.closest(".portfolio-card");
  if (!card) return;

  const slides = card.querySelectorAll(".slide");
  const dots = card.querySelectorAll(".dots span");

  let index = getCurrentIndex(slides);
  index = (index + 1) % slides.length;

  updateSlide(slides, dots, index);
}

function prevSlide(btn) {
  const card = btn.closest(".portfolio-card");
  if (!card) return;

  const slides = card.querySelectorAll(".slide");
  const dots = card.querySelectorAll(".dots span");

  let index = getCurrentIndex(slides);
  index = (index - 1 + slides.length) % slides.length;

  updateSlide(slides, dots, index);
}

function changeSlide(dot, index) {
  const card = dot.closest(".portfolio-card");
  if (!card) return;

  const slides = card.querySelectorAll(".slide");
  const dots = card.querySelectorAll(".dots span");

  updateSlide(slides, dots, index);
}

function updateSlide(slides, dots, index) {
  slides.forEach(s => s.classList.remove("active"));
  dots.forEach(d => d.classList.remove("active"));

  if (slides[index]) slides[index].classList.add("active");
  if (dots[index]) dots[index].classList.add("active");
}

// =============================
// 🚀 INIT
// =============================
window.addEventListener("DOMContentLoaded", () => {

  const email = localStorage.getItem("emailUsuario");

  if (!email) {
    window.location.href = "/";
  }

  const nome = localStorage.getItem("nomeUsuario");
  const sidebarName = document.getElementById("sidebarName");

  if (nome && sidebarName) {
    sidebarName.innerText = nome;
  }

  // scroll suave
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  carregarPedidos();
});
