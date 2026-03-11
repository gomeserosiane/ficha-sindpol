// ===============================
// ELEMENTOS DOM
// ===============================
const form1 = document.getElementById("cadastroForm1");
const form2 = document.getElementById("cadastroForm2");
const formWrapper = document.getElementById("form-wrapper");

const dependentesContainer = document.getElementById("dependentes-container");
const addDependenteBtn = document.getElementById("addDependenteBtn");

const toggleButtons = document.querySelectorAll(".toggleFormBtn");
const clearSignatureButtons = document.querySelectorAll(".clear-signature-btn");

const form1Cpf = document.getElementById("f1_cpf");
const form1Cep = document.getElementById("f1_cep");
const form1Telefone = document.getElementById("f1_telefone");

const form2Cpf = document.getElementById("f2_cpf");
const form2Cep = document.getElementById("f2_cep");
const form2Telefone = document.getElementById("f2_telefone");

const form1Canvas = document.getElementById("signature-pad-1");
const form2Canvas = document.getElementById("signature-pad-2");

let signaturePad1;
let signaturePad2;
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

function getActiveForm() {
  return document.querySelector(".form-page.active-form");
}

function getActiveSignaturePad() {
  const activeForm = getActiveForm();
  if (!activeForm) return null;
  return activeForm.id === "cadastroForm1" ? signaturePad1 : signaturePad2;
}

// ===============================
// MÁSCARAS
// ===============================
if (form1Cpf) {
  form1Cpf.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });
}

if (form2Cpf) {
  form2Cpf.addEventListener("input", (e) => {
    e.target.value = formatCPF(e.target.value);
  });
}

if (form1Cep) {
  form1Cep.addEventListener("input", (e) => {
    e.target.value = formatCEP(e.target.value);
  });
}

if (form2Cep) {
  form2Cep.addEventListener("input", (e) => {
    e.target.value = formatCEP(e.target.value);
  });
}

if (form1Telefone) {
  form1Telefone.addEventListener("input", (e) => {
    e.target.value = formatPhone(e.target.value);
  });
}

if (form2Telefone) {
  form2Telefone.addEventListener("input", (e) => {
    e.target.value = formatPhone(e.target.value);
  });
}

// ===============================
// VIA CEP
// ===============================
async function buscarCEP(cep, prefix) {
  const cepLimpo = onlyNumbers(cep);

  if (cepLimpo.length !== 8) return;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert("CEP não encontrado.");
      return;
    }

    const enderecoInput = document.getElementById(`${prefix}_endereco`);
    const bairroInput = document.getElementById(`${prefix}_bairro`);
    const cidadeInput = document.getElementById(`${prefix}_cidade`);
    const ufInput = document.getElementById(`${prefix}_uf`);

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

if (form1Cep) {
  form1Cep.addEventListener("blur", () => {
    buscarCEP(form1Cep.value, "f1");
  });
}

if (form2Cep) {
  form2Cep.addEventListener("blur", () => {
    buscarCEP(form2Cep.value, "f2");
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
// ASSINATURAS DIGITAIS
// ===============================
function createSignaturePad(canvasEl, existingPad) {
  if (!canvasEl) return null;

  const parentWidth = canvasEl.parentElement.offsetWidth;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);

  const oldData = existingPad && !existingPad.isEmpty()
    ? existingPad.toData()
    : null;

  canvasEl.width = parentWidth * ratio;
  canvasEl.height = 240 * ratio;
  canvasEl.style.width = `${parentWidth}px`;
  canvasEl.style.height = "240px";

  const ctx = canvasEl.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);

  const newPad = new SignaturePad(canvasEl, {
    minWidth: 0.8,
    maxWidth: 2,
    penColor: "#111827",
    backgroundColor: "rgb(255,255,255)",
  });

  if (oldData) {
    newPad.fromData(oldData);
  }

  return newPad;
}

function initAllSignaturePads() {
  signaturePad1 = createSignaturePad(form1Canvas, signaturePad1);
  signaturePad2 = createSignaturePad(form2Canvas, signaturePad2);
}

initAllSignaturePads();
window.addEventListener("resize", initAllSignaturePads);

clearSignatureButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;

    if (target === "1" && signaturePad1) {
      signaturePad1.clear();
    }

    if (target === "2" && signaturePad2) {
      signaturePad2.clear();
    }
  });
});

// ===============================
// ALTERNAR FORMULÁRIOS
// ===============================
function alternarFormulario() {
  const isForm1Active = form1.classList.contains("active-form");

  if (isForm1Active) {
    form1.classList.remove("active-form");
    form1.classList.add("hidden-form");

    form2.classList.remove("hidden-form");
    form2.classList.add("active-form");
  } else {
    form2.classList.remove("active-form");
    form2.classList.add("hidden-form");

    form1.classList.remove("hidden-form");
    form1.classList.add("active-form");
  }

  setTimeout(() => {
    initAllSignaturePads();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 50);
}

toggleButtons.forEach((button) => {
  button.addEventListener("click", alternarFormulario);
});

// ===============================
// PREPARAR FORMULÁRIO PARA CAPTURA
// ===============================
function lockFormVisualState(targetForm) {
  const elements = targetForm.querySelectorAll("input, select, textarea");

  elements.forEach((el) => {
    el.blur();
    el.setAttribute("value", el.value || "");

    if (el.tagName === "SELECT") {
      Array.from(el.options).forEach((option) => {
        option.removeAttribute("selected");
        if (option.value === el.value) {
          option.setAttribute("selected", "selected");
        }
      });
    }

    if (el.type === "checkbox" || el.type === "radio") {
      if (el.checked) {
        el.setAttribute("checked", "checked");
      } else {
        el.removeAttribute("checked");
      }
    }
  });
}

// ===============================
// GERAR IMAGEM DO FORMULÁRIO ATIVO
// ===============================
async function gerarImagemFormulario(targetForm, submitButton) {
  lockFormVisualState(targetForm);

  const originalButtonText = submitButton ? submitButton.textContent : "";
  const originalDisabled = submitButton ? submitButton.disabled : false;

  if (submitButton) {
    submitButton.textContent = "Gerando imagem...";
    submitButton.disabled = true;
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  const targetWidth = targetForm.scrollWidth;
  const targetHeight = targetForm.scrollHeight;

  const canvasResult = await html2canvas(targetForm, {
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

  if (submitButton) {
    submitButton.textContent = originalButtonText;
    submitButton.disabled = originalDisabled;
  }

  return canvasResult;
}

// ===============================
// DOWNLOAD DA IMAGEM
// ===============================
function downloadCanvasImage(canvasEl, targetForm) {
  const nomeInput = targetForm.querySelector('input[name="nome"]');
  const nome = nomeInput ? nomeInput.value.trim() : "";
  const safeName = sanitizeFileName(nome || "formulario");
  const timestamp = getFormattedToday();
  const formType = targetForm.id === "cadastroForm1" ? "completo" : "alternativo";
  const fileName = `ficha_${formType}_${safeName}_${timestamp}.jpg`;

  const imageData = canvasEl.toDataURL("image/jpeg", 0.95);

  const link = document.createElement("a");
  link.href = imageData;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ===============================
// SUBMIT FORMULÁRIO 1
// ===============================
async function handleSubmitForm1(event) {
  event.preventDefault();

  if (!form1.checkValidity()) {
    form1.reportValidity();
    return;
  }

  if (!signaturePad1 || signaturePad1.isEmpty()) {
    alert("Por favor, faça a assinatura digital antes de enviar.");
    return;
  }

  const submitButton = form1.querySelector(".submit-btn");

  try {
    if (submitButton) {
      submitButton.textContent = "Preparando download...";
      submitButton.disabled = true;
    }

    form1.classList.add("loading");

    const canvasResult = await gerarImagemFormulario(form1, submitButton);
    downloadCanvasImage(canvasResult, form1);

    alert("Imagem do formulário baixada com sucesso.");
  } catch (error) {
    console.error("Erro ao gerar imagem do formulário 1:", error);
    alert("Não foi possível gerar o download da imagem do formulário.");
  } finally {
    if (submitButton) {
      submitButton.textContent = "Enviar formulário";
      submitButton.disabled = false;
    }

    form1.classList.remove("loading");
  }
}

// ===============================
// SUBMIT FORMULÁRIO 2
// ===============================
async function handleSubmitForm2(event) {
  event.preventDefault();

  if (!form2.checkValidity()) {
    form2.reportValidity();
    return;
  }

  if (!signaturePad2 || signaturePad2.isEmpty()) {
    alert("Por favor, faça a assinatura digital antes de enviar.");
    return;
  }

  const submitButton = form2.querySelector(".submit-btn");

  try {
    if (submitButton) {
      submitButton.textContent = "Preparando download...";
      submitButton.disabled = true;
    }

    form2.classList.add("loading");

    const canvasResult = await gerarImagemFormulario(form2, submitButton);
    downloadCanvasImage(canvasResult, form2);

    alert("Imagem do formulário baixada com sucesso.");
  } catch (error) {
    console.error("Erro ao gerar imagem do formulário 2:", error);
    alert("Não foi possível gerar o download da imagem do formulário.");
  } finally {
    if (submitButton) {
      submitButton.textContent = "Enviar formulário";
      submitButton.disabled = false;
    }

    form2.classList.remove("loading");
  }
}

if (form1) {
  form1.addEventListener("submit", handleSubmitForm1);
}

if (form2) {
  form2.addEventListener("submit", handleSubmitForm2);
}