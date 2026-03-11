// ===============================
// ELEMENTOS DOM
// ===============================
const form = document.getElementById("cadastroForm");
const addDependenteBtn = document.getElementById("addDependenteBtn");
const dependentesContainer = document.getElementById("dependentes-container");
const cepInput = document.getElementById("cep");
const submitBtn = document.getElementById("submitBtn");
const formWrapper = document.getElementById("form-wrapper");
const canvas = document.getElementById("signature-pad");
const clearSignatureBtn = document.getElementById("clearSignatureBtn");

let signaturePad;
let dependenteIndex = 0;

// ===============================
// FUNÇÕES AUXILIARES
// ===============================
function onlyNumbers(value) {
  return (value || "").replace(/\D/g, "");
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

function getFormattedToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}_${hh}-${mi}`;
}

function sanitizeFileName(value) {
  return String(value || "formulario")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

// ===============================
// MÁSCARAS
// ===============================
const cpfInput = document.getElementById("cpf");
const telefoneInput = document.getElementById("telefone");

if (cpfInput) {
  cpfInput.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });
}

if (cepInput) {
  cepInput.addEventListener("input", (e) => {
    e.target.value = formatCEP(e.target.value);
  });
}

if (telefoneInput) {
  telefoneInput.addEventListener("input", (e) => {
    e.target.value = formatPhone(e.target.value);
  });
}

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

    const enderecoInput = document.getElementById("endereco");
    const bairroInput = document.getElementById("bairro");
    const cidadeInput = document.getElementById("cidade");
    const ufInput = document.getElementById("uf");

    if (bairroInput) bairroInput.value = data.bairro || "";
    if (cidadeInput) cidadeInput.value = data.localidade || "";
    if (ufInput) ufInput.value = data.uf || "";

    if (enderecoInput && !enderecoInput.value.trim()) {
      enderecoInput.value = data.logradouro || "";
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    alert("Erro ao consultar o CEP.");
  }
}

if (cepInput) {
  cepInput.addEventListener("blur", () => {
    buscarCEP(cepInput.value);
  });
}

// ===============================
// DEPENDENTES DINÂMICOS
// ===============================
function criarDependenteCard() {
  dependenteIndex += 1;

  const card = document.createElement("div");
  card.className = "dependente-card";
  card.dataset.index = dependenteIndex;

  card.innerHTML = `
    <div class="dependente-top">
      <span class="dependente-title">Dependente ${dependenteIndex}</span>
      <button type="button" class="btn btn-danger delete-btn" aria-label="Excluir dependente">
        🗑 Excluir
      </button>
    </div>

    <div class="grid">
      <div class="field full">
        <label for="dependente_nome_${dependenteIndex}">Nome:</label>
        <input type="text" id="dependente_nome_${dependenteIndex}" name="dependente_nome_${dependenteIndex}" />
      </div>

      <div class="field">
        <label for="dependente_parentesco_${dependenteIndex}">Parentesco:</label>
        <input type="text" id="dependente_parentesco_${dependenteIndex}" name="dependente_parentesco_${dependenteIndex}" />
      </div>

      <div class="field">
        <label for="dependente_nascimento_${dependenteIndex}">Data de nascimento:</label>
        <input type="date" id="dependente_nascimento_${dependenteIndex}" name="dependente_nascimento_${dependenteIndex}" />
      </div>
    </div>
  `;

  const deleteBtn = card.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => {
    card.remove();
  });

  dependentesContainer.appendChild(card);
}

if (addDependenteBtn) {
  addDependenteBtn.addEventListener("click", criarDependenteCard);
}

// ===============================
// ASSINATURA DIGITAL
// ===============================
function initSignaturePad() {
  if (!canvas) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const parentWidth = canvas.parentElement.offsetWidth;

  const previousData =
    signaturePad && !signaturePad.isEmpty() ? signaturePad.toData() : null;

  canvas.width = parentWidth * ratio;
  canvas.height = 240 * ratio;
  canvas.style.width = `${parentWidth}px`;
  canvas.style.height = "240px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);

  signaturePad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2,
    penColor: "#111827",
    backgroundColor: "rgb(255,255,255)",
  });

  if (previousData) {
    signaturePad.fromData(previousData);
  }
}

initSignaturePad();
window.addEventListener("resize", initSignaturePad);

if (clearSignatureBtn) {
  clearSignatureBtn.addEventListener("click", () => {
    if (signaturePad) {
      signaturePad.clear();
    }
  });
}

// ===============================
// PREPARAR FORMULÁRIO PARA CAPTURA
// ===============================
function lockFormVisualState() {
  const elements = formWrapper.querySelectorAll("input, select, textarea");

  elements.forEach((el) => {
    if (el.tagName === "SELECT") {
      const selectedText = el.options[el.selectedIndex]
        ? el.options[el.selectedIndex].text
        : "";
      el.setAttribute("data-html2canvas-value", selectedText);
    } else {
      el.setAttribute("data-html2canvas-value", el.value || "");
    }

    el.blur();
  });
}

// ===============================
// GERAR IMAGEM DO FORMULÁRIO
// ===============================
async function gerarImagemFormulario() {
  lockFormVisualState();

  const originalButtonText = submitBtn ? submitBtn.textContent : "";
  const originalDisabled = submitBtn ? submitBtn.disabled : false;

  if (submitBtn) {
    submitBtn.textContent = "Gerando imagem...";
    submitBtn.disabled = true;
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  const targetWidth = formWrapper.scrollWidth;
  const targetHeight = formWrapper.scrollHeight;

  const screenshotCanvas = await html2canvas(formWrapper, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: targetWidth,
    height: targetHeight,
    windowWidth: targetWidth,
    windowHeight: targetHeight,
    scrollX: 0,
    scrollY: 0,
  });

  if (submitBtn) {
    submitBtn.textContent = originalButtonText;
    submitBtn.disabled = originalDisabled;
  }

  return screenshotCanvas;
}

// ===============================
// DOWNLOAD DA IMAGEM
// ===============================
function downloadCanvasImage(canvasEl) {
  const nomeInput = document.getElementById("nome");
  const nome = nomeInput ? nomeInput.value.trim() : "";
  const safeName = sanitizeFileName(nome || "formulario");
  const timestamp = getFormattedToday();
  const fileName = `ficha_${safeName}_${timestamp}.jpg`;

  const imageData = canvasEl.toDataURL("image/jpeg", 0.95);

  const link = document.createElement("a");
  link.href = imageData;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===============================
// ENVIO = DOWNLOAD
// ===============================
async function handleSubmit(event) {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!signaturePad || signaturePad.isEmpty()) {
    alert("Por favor, faça a assinatura digital antes de enviar.");
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.textContent = "Preparando download...";
      submitBtn.disabled = true;
    }

    form.classList.add("loading");

    const canvasResult = await gerarImagemFormulario();
    downloadCanvasImage(canvasResult);

    alert("Imagem do formulário baixada com sucesso.");
  } catch (error) {
    console.error("Erro ao gerar imagem do formulário:", error);
    alert("Não foi possível gerar o download da imagem do formulário.");
  } finally {
    if (submitBtn) {
      submitBtn.textContent = "Enviar formulário";
      submitBtn.disabled = false;
    }

    form.classList.remove("loading");
  }
}

if (form) {
  form.addEventListener("submit", handleSubmit);
}