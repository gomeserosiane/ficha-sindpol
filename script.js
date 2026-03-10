// ===============================
// CONFIGURE AQUI
// ===============================
const EMAILJS_PUBLIC_KEY = "4gFOKUyAnp4r6vTku";
const EMAILJS_SERVICE_ID = "SINDPOL";
const EMAILJS_TEMPLATE_ID = "template_mqw92lw";
const DESTINO_EMAIL = "gomeserosiane.dev@gmail.com";

// ===============================
// INICIALIZA EMAILJS
// ===============================
emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY,
});

const form = document.getElementById("cadastroForm");
const addDependenteBtn = document.getElementById("addDependenteBtn");
const dependentesContainer = document.getElementById("dependentes-container");
const cepInput = document.getElementById("cep");
const submitBtn = document.getElementById("submitBtn");
const formWrapper = document.getElementById("form-wrapper");

// ===============================
// MÁSCARAS
// ===============================
function onlyNumbers(value) {
  return value.replace(/\D/g, "");
}

function formatCPF(value) {
  value = onlyNumbers(value).slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return value;
}

function formatCEP(value) {
  value = onlyNumbers(value).slice(0, 8);
  value = value.replace(/(\d{5})(\d)/, "$1-$2");
  return value;
}

function formatPhone(value) {
  value = onlyNumbers(value).slice(0, 11);
  if (value.length <= 10) {
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
  }
  return value;
}

document.getElementById("cpf").addEventListener("input", (e) => {
  e.target.value = formatCPF(e.target.value);
});

document.getElementById("cep").addEventListener("input", (e) => {
  e.target.value = formatCEP(e.target.value);
});

document.getElementById("telefone").addEventListener("input", (e) => {
  e.target.value = formatPhone(e.target.value);
});

// ===============================
// VIA CEP
// ===============================
async function buscarCEP(cep) {
  const cepLimpo = onlyNumbers(cep);

  if (cepLimpo.length !== 8) return;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert("CEP não encontrado.");
      return;
    }

    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("uf").value = data.uf || "";

    if (data.logradouro) {
      const enderecoAtual = document.getElementById("endereco").value.trim();
      if (!enderecoAtual) {
        document.getElementById("endereco").value = data.logradouro;
      }
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    alert("Erro ao consultar o CEP.");
  }
}

cepInput.addEventListener("blur", () => {
  buscarCEP(cepInput.value);
});

// ===============================
// DEPENDENTES DINÂMICOS
// ===============================
let dependenteIndex = 0;

function criarDependenteCard() {
  dependenteIndex++;

  const card = document.createElement("div");
  card.className = "dependente-card";
  card.dataset.index = dependenteIndex;

  card.innerHTML = `
    <div class="dependente-top">
      <span class="dependente-title">Dependente ${dependenteIndex}</span>
      <button type="button" class="btn btn-danger delete-btn">
        🗑 Excluir
      </button>
    </div>

    <div class="grid">
      <div class="field full">
        <label>Nome:</label>
        <input type="text" name="dependente_nome_${dependenteIndex}" />
      </div>

      <div class="field">
        <label>Parentesco:</label>
        <input type="text" name="dependente_parentesco_${dependenteIndex}" />
      </div>

      <div class="field">
        <label>Data de nascimento:</label>
        <input type="date" name="dependente_nascimento_${dependenteIndex}" />
      </div>
    </div>
  `;

  const deleteBtn = card.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => {
    card.remove();
  });

  dependentesContainer.appendChild(card);
}

addDependenteBtn.addEventListener("click", criarDependenteCard);

// ===============================
// ASSINATURA DIGITAL
// ===============================
const canvas = document.getElementById("signature-pad");
const clearSignatureBtn = document.getElementById("clearSignatureBtn");
let signaturePad;

function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const parentWidth = canvas.parentElement.offsetWidth;

  canvas.width = parentWidth * ratio;
  canvas.height = 240 * ratio;
  canvas.style.width = `${parentWidth}px`;
  canvas.style.height = `240px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);

  signaturePad = new SignaturePad(canvas, {
    minWidth: 1,
    maxWidth: 2.5,
    penColor: "#111827",
    backgroundColor: "rgba(255,255,255,1)",
  });
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

clearSignatureBtn.addEventListener("click", () => {
  signaturePad.clear();
});

// ===============================
// COLETAR DEPENDENTES
// ===============================
function getDependentes() {
  const cards = [...document.querySelectorAll(".dependente-card")];

  return cards.map((card) => {
    const inputs = card.querySelectorAll("input");
    return {
      nome: inputs[0]?.value || "",
      parentesco: inputs[1]?.value || "",
      nascimento: inputs[2]?.value || "",
    };
  }).filter(dep => dep.nome || dep.parentesco || dep.nascimento);
}

function getDependentesHTML(dependentes) {
  if (!dependentes.length) {
    return "<p>Nenhum dependente informado.</p>";
  }

  return dependentes.map((dep, index) => `
    <div style="margin-bottom:10px; padding:10px; border:1px solid #ddd; border-radius:8px;">
      <strong>Dependente ${index + 1}</strong><br>
      Nome: ${dep.nome || "-"}<br>
      Parentesco: ${dep.parentesco || "-"}<br>
      Data de nascimento: ${dep.nascimento || "-"}
    </div>
  `).join("");
}

function getDependentesText(dependentes) {
  if (!dependentes.length) return "Nenhum dependente informado.";

  return dependentes.map((dep, index) => {
    return `Dependente ${index + 1}:
Nome: ${dep.nome || "-"}
Parentesco: ${dep.parentesco || "-"}
Data de nascimento: ${dep.nascimento || "-"}`;
  }).join("\n\n");
}

// ===============================
// GERAR PDF DO FORMULÁRIO
// ===============================
async function gerarPDFBase64() {
  const { jsPDF } = window.jspdf;

  const canvasForm = await html2canvas(formWrapper, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    scrollY: -window.scrollY
  });

  const imgData = canvasForm.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = 210;
  const pageHeight = 297;

  const imgWidth = pdfWidth;
  const imgHeight = (canvasForm.height * imgWidth) / canvasForm.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output("datauristring");
}

// ===============================
// ENVIAR E-MAIL
// ===============================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (signaturePad.isEmpty()) {
    alert("Por favor, faça a assinatura digital antes de enviar.");
    return;
  }

  try {
    submitBtn.textContent = "Enviando...";
    submitBtn.disabled = true;
    form.classList.add("loading");

    const formData = new FormData(form);
    const dependentes = getDependentes();

    const assinaturaBase64 = signaturePad.toDataURL("image/png");
    const pdfBase64 = await gerarPDFBase64();

    const templateParams = {
      to_email: DESTINO_EMAIL,

      nome: formData.get("nome") || "",
      rg: formData.get("rg") || "",
      cpf: formData.get("cpf") || "",
      matricula: formData.get("matricula") || "",
      sexo: formData.get("sexo") || "",
      admissao: formData.get("admissao") || "",
      nascimento: formData.get("nascimento") || "",
      tipoSanguineo: formData.get("tipoSanguineo") || "",
      risp: formData.get("risp") || "",

      endereco: formData.get("endereco") || "",
      cep: formData.get("cep") || "",
      bairro: formData.get("bairro") || "",
      cidade: formData.get("cidade") || "",
      uf: formData.get("uf") || "",
      telefone: formData.get("telefone") || "",
      email: formData.get("email") || "",

      estadoCivil: formData.get("estadoCivil") || "",
      cargo: formData.get("cargo") || "",
      lotacao: formData.get("lotacao") || "",
      classe: formData.get("classe") || "",
      situacaoFuncional: formData.get("situacaoFuncional") || "",
      nomeMae: formData.get("nomeMae") || "",
      nomePai: formData.get("nomePai") || "",

      dependentes_texto: getDependentesText(dependentes),
      dependentes_html: getDependentesHTML(dependentes),

      // anexos variáveis
      signature_image: assinaturaBase64,
      form_pdf: pdfBase64,
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    alert("Formulário enviado com sucesso!");
    form.reset();
    signaturePad.clear();
    dependentesContainer.innerHTML = "";
  } catch (error) {
    console.error("Erro ao enviar:", error);
    alert("Erro ao enviar formulário. Verifique sua configuração do EmailJS.");
  } finally {
    submitBtn.textContent = "Enviar formulário";
    submitBtn.disabled = false;
    form.classList.remove("loading");
  }
});