function toggle() {
  document.getElementById("card").classList.toggle("active");
}

// 🔥 Máscara CPF
function formatCPF(input) {
  let value = input.value;

  value = value.replace(/\D/g, "");
  value = value.substring(0, 11);

  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  input.value = value;
}

// =============================
// 🔑 LOGIN REAL
// =============================
async function login() {
  let cpf = document.getElementById("loginCpf").value;
  let senha = document.getElementById("loginSenha").value;

  let cpfNumerico = cpf.replace(/\D/g, "");

  if (!cpf || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  if (cpfNumerico.length !== 11) {
    alert("CPF inválido!");
    return;
  }

  try {
    let res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cpf: cpfNumerico,
        senha: senha
      })
    });

    let data = await res.json();

    alert(data.msg);

    if (data.msg === "Login OK") {

      // 🔥 DADOS DO USUÁRIO
      localStorage.setItem("nomeUsuario", data.nome);
      localStorage.setItem("emailUsuario", data.email);
      localStorage.setItem("cpfUsuario", cpfNumerico);

      // 👑 SALVA SE É ADMIN
      localStorage.setItem("isAdmin", data.admin ? "true" : "false");

      // 🚀 vai pro dashboard
      window.location.href = "/dashboard";
    }

  } catch (erro) {
    alert("Erro ao conectar com o servidor");
    console.error(erro);
  }
}

// =============================
// 📝 CADASTRO REAL
// =============================
async function cadastrar() {
  let inputs = document.querySelectorAll(".cadastro input");

  let nome = inputs[0].value;
  let cpf = inputs[1].value;
  let email = inputs[2].value;
  let senha = inputs[3].value;

  let cpfNumerico = cpf.replace(/\D/g, "");

  if (!nome || !cpf || !email || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  if (cpfNumerico.length !== 11) {
    alert("CPF inválido!");
    return;
  }

  try {
    let res = await fetch("/cadastrar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nome: nome,
        cpf: cpfNumerico,
        email: email,
        senha: senha
      })
    });

    let data = await res.json();

    alert(data.msg);

    if (data.msg.includes("sucesso")) {
      toggle(); // volta pro login
    }

  } catch (erro) {
    alert("Erro ao conectar com o servidor");
    console.error(erro);
  }
}
