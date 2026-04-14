// ===============================
// ELEMENTOS DOM
// ===============================
const form1 = document.getElementById("cadastroForm1");
const form2 = document.getElementById("cadastroForm2");

const welcomeScreen = document.getElementById("welcome-screen");
const digitalFormsArea = document.getElementById("digital-forms-area");
const digitalModeBtn = document.getElementById("digitalModeBtn");
const manualModeBtn = document.getElementById("manualModeBtn");
const backToHomeBtn = document.getElementById("backToHomeBtn");

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

const form2bCpf = document.getElementById("f2b_cpf");
const form2bCep = document.getElementById("f2b_cep");
const form2bTelefone = document.getElementById("f2b_telefone");

const form1Canvas = document.getElementById("signature-pad-1");
const form2Canvas = document.getElementById("signature-pad-2");

let signaturePad1;
let signaturePad2;
let dependenteIndex = 0;

// ===============================
// CONFIGURAÇÕES
// ===============================
let planoSaudePromptShown = false;
let planoSaudeObserver = null;

// ===============================
// PALETA / TEMA
// ===============================
const THEME = {
  blue: "1F4E79",
  blueSoft: "DCEAF7",
  blueMid: "5B9BD5",
  dark: "1F2937",
  gray: "6B7280",
  border: "D1D5DB",
  white: "FFFFFF",
  green: "0F766E",
};

// ===============================
// TELA INICIAL / MODOS
// ===============================
function abrirModoDigital() {
  if (welcomeScreen) {
    welcomeScreen.style.display = "none";
    welcomeScreen.classList.add("hidden-area");
  }

  if (digitalFormsArea) {
    digitalFormsArea.classList.remove("hidden-area");
    digitalFormsArea.style.display = "block";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  setTimeout(() => {
    initAllSignaturePads();
    watchPlanoSaudeSection();
  }, 100);
}

function baixarPDFManual() {
  const link = document.createElement("a");
  link.href = "docs/ficha-manual.pdf";
  link.download = "ficha-manual.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function voltarTelaInicial() {
  if (digitalFormsArea) {
    digitalFormsArea.style.display = "none";
    digitalFormsArea.classList.add("hidden-area");
  }

  if (welcomeScreen) {
    welcomeScreen.classList.remove("hidden-area");
    welcomeScreen.style.display = "flex";
  }

  if (form1) {
    form1.classList.add("active-form");
    form1.classList.remove("hidden-form");
  }

  if (form2) {
    form2.classList.add("hidden-form");
    form2.classList.remove("active-form");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

if (digitalModeBtn) {
  digitalModeBtn.addEventListener("click", abrirModoDigital);
}

if (manualModeBtn) {
  manualModeBtn.addEventListener("click", baixarPDFManual);
}

if (backToHomeBtn) {
  backToHomeBtn.addEventListener("click", voltarTelaInicial);
}

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

function formatDateBR(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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

function getBaseFileName(targetForm, extension = "") {
  const nomeInput = targetForm.querySelector('input[name="nome"]');
  const nome = nomeInput ? nomeInput.value.trim() : "";
  const safeName = sanitizeFileName(nome || "formulario");
  const timestamp = getFormattedToday();
  const formType = targetForm.id === "cadastroForm1" ? "completo" : "alternativo";
  return `ficha_${formType}_${safeName}_${timestamp}${extension}`;
}

function getActiveSignaturePad(targetForm) {
  return targetForm.id === "cadastroForm1" ? signaturePad1 : signaturePad2;
}

function getHeaderImageElement(targetForm) {
  return targetForm.querySelector(".header-image");
}

async function imageElementToDataURL(imgEl) {
  if (!imgEl) return null;

  if (imgEl.src.startsWith("data:")) {
    return imgEl.src;
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Erro ao converter imagem para dataURL:", error);
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = imgEl.src;
  });
}

function getSignatureDataURL(targetForm) {
  const pad = getActiveSignaturePad(targetForm);
  if (!pad || pad.isEmpty()) return null;
  return pad.toDataURL("image/png");
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function addWrappedText(doc, text, x, y, maxWidth, options = {}) {
  const lines = doc.splitTextToSize(text || "-", maxWidth);
  doc.text(lines, x, y, options);
  return y + (lines.length * (options.lineHeightFactor || 1.3) * (doc.getFontSize() / 2.6));
}

function getFieldBySelectors(root, selectors) {
  if (!root || !selectors || !selectors.length) return null;

  for (const selector of selectors) {
    const found = root.querySelector(selector);
    if (found) return found;
  }

  return null;
}

// ===============================
// MÁSCARAS
// ===============================
[form1Cpf, form2Cpf, form2bCpf].forEach((input) => {
  if (input) {
    input.addEventListener("input", (e) => {
      e.target.value = formatCPF(e.target.value);
    });
  }
});

[form1Cep, form2Cep, form2bCep].forEach((input) => {
  if (input) {
    input.addEventListener("input", (e) => {
      e.target.value = formatCEP(e.target.value);
    });
  }
});

[form1Telefone, form2Telefone, form2bTelefone].forEach((input) => {
  if (input) {
    input.addEventListener("input", (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  }
});

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
  form1Cep.addEventListener("blur", () => buscarCEP(form1Cep.value, "f1"));
}

if (form2Cep) {
  form2Cep.addEventListener("blur", () => buscarCEP(form2Cep.value, "f2"));
}

if (form2bCep) {
  form2bCep.addEventListener("blur", () => buscarCEP(form2bCep.value, "f2b"));
}

// ===============================
// DEPENDENTES
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
  deleteBtn.addEventListener("click", () => card.remove());

  if (dependentesContainer) {
    dependentesContainer.appendChild(card);
  }
}

if (addDependenteBtn) {
  addDependenteBtn.addEventListener("click", criarDependenteCard);
}

function getDependentes() {
  const cards = [...document.querySelectorAll(".dependente-card")];

  return cards
    .map((card) => {
      const nome = card.querySelector('input[name^="dependente_nome_"]')?.value?.trim() || "";
      const parentesco = card.querySelector('input[name^="dependente_parentesco_"]')?.value?.trim() || "";
      const nascimento = card.querySelector('input[name^="dependente_nascimento_"]')?.value || "";

      return {
        nome,
        parentesco,
        nascimento: formatDateBR(nascimento),
      };
    })
    .filter((dep) => dep.nome || dep.parentesco || dep.nascimento);
}

// ===============================
// ASSINATURA
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
// ALERTA / CÓPIA DE DADOS - FORM 2
// ===============================
function getForm2PreviousFields() {
  if (!form2) return {};

  return {
    nome: getFieldBySelectors(form2, ['#f2_nome', 'input[name="nome"]']),
    rg: getFieldBySelectors(form2, ['#f2_rg', 'input[name="rg"]']),
    cpf: getFieldBySelectors(form2, ['#f2_cpf', 'input[name="cpf"]']),
    sexo: getFieldBySelectors(form2, ['#f2_sexo', 'select[name="sexo"]', 'input[name="sexo"]']),
    nascimento: getFieldBySelectors(form2, ['#f2_nascimento', 'input[name="nascimento"]']),
    nomeMae: getFieldBySelectors(form2, ['#f2_nomeMae', 'input[name="nomeMae"]']),
    cep: getFieldBySelectors(form2, ['#f2_cep', 'input[name="cep"]']),
    endereco: getFieldBySelectors(form2, ['#f2_endereco', 'input[name="endereco"]']),
    bairro: getFieldBySelectors(form2, ['#f2_bairro', 'input[name="bairro"]']),
    cidade: getFieldBySelectors(form2, ['#f2_cidade', 'input[name="cidade"]']),
    uf: getFieldBySelectors(form2, ['#f2_uf', 'input[name="uf"]', 'select[name="uf"]']),
    telefone: getFieldBySelectors(form2, ['#f2_telefone', 'input[name="telefone"]']),
    email: getFieldBySelectors(form2, ['#f2_email', 'input[name="email"]']),
  };
}

function getForm2PlanoSaudeFields() {
  if (!form2) return {};

  return {
    nome: getFieldBySelectors(form2, ['#f2b_nome', 'input[name="nome_adicional"]']),
    rg: getFieldBySelectors(form2, ['#f2b_rg', 'input[name="rg_adicional"]']),
    cpf: getFieldBySelectors(form2, ['#f2b_cpf', 'input[name="cpf_adicional"]']),
    sexo: getFieldBySelectors(form2, ['#f2b_sexo', 'select[name="sexo_adicional"]', 'input[name="sexo_adicional"]']),
    nascimento: getFieldBySelectors(form2, ['#f2b_nascimento', 'input[name="nascimento_adicional"]']),
    nomeMae: getFieldBySelectors(form2, ['#f2b_nomeMae', 'input[name="nomeMae_adicional"]']),
    cep: getFieldBySelectors(form2, ['#f2b_cep', 'input[name="cep_adicional"]']),
    endereco: getFieldBySelectors(form2, ['#f2b_endereco', 'input[name="endereco_adicional"]']),
    bairro: getFieldBySelectors(form2, ['#f2b_bairro', 'input[name="bairro_adicional"]']),
    cidade: getFieldBySelectors(form2, ['#f2b_cidade', 'input[name="cidade_adicional"]']),
    uf: getFieldBySelectors(form2, ['#f2b_uf', 'input[name="uf_adicional"]', 'select[name="uf_adicional"]']),
    telefone: getFieldBySelectors(form2, ['#f2b_telefone', 'input[name="telefone_adicional"]']),
    email: getFieldBySelectors(form2, ['#f2b_email', 'input[name="email_adicional"]']),
  };
}

function hasAnyPreviousForm2Data() {
  const fields = getForm2PreviousFields();

  return Object.values(fields).some((field) => {
    if (!field) return false;
    return String(field.value || "").trim() !== "";
  });
}

function copyForm2DataToPlanoSaude() {
  const source = getForm2PreviousFields();
  const target = getForm2PlanoSaudeFields();

  Object.keys(source).forEach((key) => {
    if (!source[key] || !target[key]) return;
    target[key].value = source[key].value || "";
    target[key].dispatchEvent(new Event("input", { bubbles: true }));
    target[key].dispatchEvent(new Event("change", { bubbles: true }));
  });

  if (target.cpf) target.cpf.value = formatCPF(target.cpf.value);
  if (target.cep) target.cep.value = formatCEP(target.cep.value);
  if (target.telefone) target.telefone.value = formatPhone(target.telefone.value);
}

function closePlanoSaudePrompt() {
  const overlay = document.getElementById("plano-saude-alert-overlay");
  if (overlay) {
    overlay.remove();
  }
}

function showPlanoSaudePrompt() {
  if (planoSaudePromptShown) return;
  if (!hasAnyPreviousForm2Data()) return;

  planoSaudePromptShown = true;
  closePlanoSaudePrompt();

  const overlay = document.createElement("div");
  overlay.id = "plano-saude-alert-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15, 23, 42, 0.55)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";
  overlay.style.zIndex = "9999";

  const modal = document.createElement("div");
  modal.style.width = "100%";
  modal.style.maxWidth = "520px";
  modal.style.background = "#FFFFFF";
  modal.style.borderRadius = "16px";
  modal.style.boxShadow = "0 24px 80px rgba(0,0,0,0.22)";
  modal.style.padding = "24px";
  modal.style.fontFamily = "inherit";
  modal.style.textAlign = "center";

  const title = document.createElement("h3");
  title.textContent = "Clube de Benefícios Planos de Saúde";
  title.style.margin = "0 0 12px";
  title.style.fontSize = "22px";
  title.style.color = "#111827";

  const message = document.createElement("p");
  message.textContent = "Gostaria de utilizar os mesmos dados para preencher os campos abaixo ?";
  message.style.margin = "0 0 22px";
  message.style.fontSize = "16px";
  message.style.lineHeight = "1.5";
  message.style.color = "#374151";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "12px";
  actions.style.justifyContent = "center";
  actions.style.flexWrap = "wrap";

  const yesButton = document.createElement("button");
  yesButton.type = "button";
  yesButton.textContent = "SIM";
  yesButton.style.border = "none";
  yesButton.style.borderRadius = "10px";
  yesButton.style.padding = "12px 28px";
  yesButton.style.fontSize = "15px";
  yesButton.style.fontWeight = "700";
  yesButton.style.cursor = "pointer";
  yesButton.style.background = "#16A34A";
  yesButton.style.color = "#FFFFFF";

  const noButton = document.createElement("button");
  noButton.type = "button";
  noButton.textContent = "NÃO";
  noButton.style.border = "none";
  noButton.style.borderRadius = "10px";
  noButton.style.padding = "12px 28px";
  noButton.style.fontSize = "15px";
  noButton.style.fontWeight = "700";
  noButton.style.cursor = "pointer";
  noButton.style.background = "#DC2626";
  noButton.style.color = "#FFFFFF";

  yesButton.addEventListener("click", () => {
    copyForm2DataToPlanoSaude();
    closePlanoSaudePrompt();
  });

  noButton.addEventListener("click", () => {
    closePlanoSaudePrompt();
  });

  actions.appendChild(yesButton);
  actions.appendChild(noButton);

  modal.appendChild(title);
  modal.appendChild(message);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function findPlanoSaudeSection() {
  if (!form2) return null;

  const directSelectors = [
    "#plano-saude-section",
    "#form2-plano-saude",
    "#clube-beneficios-planos-saude",
    '[data-section="clube-beneficios-planos-saude"]',
    ".clube-beneficios-planos-saude",
  ];

  for (const selector of directSelectors) {
    const el = form2.querySelector(selector);
    if (el) return el;
  }

  const possibleNodes = form2.querySelectorAll("section, div, fieldset");
  for (const node of possibleNodes) {
    const text = (node.textContent || "").toLowerCase().replace(/\s+/g, " ").trim();

    if (
      text.includes("clube de benefícios planos de saúde") ||
      text.includes("clube de beneficios planos de saude") ||
      text.includes("planos de saúde") ||
      text.includes("planos de saude")
    ) {
      return node;
    }
  }

  return null;
}

function watchPlanoSaudeSection() {
  if (!form2) return;

  if (planoSaudeObserver) {
    planoSaudeObserver.disconnect();
    planoSaudeObserver = null;
  }

  const planoSection = findPlanoSaudeSection();
  if (!planoSection) return;

  planoSaudeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          showPlanoSaudePrompt();
        }
      });
    },
    {
      threshold: 0.35,
    }
  );

  planoSaudeObserver.observe(planoSection);
}

// ===============================
// ALTERNAR FORM
// ===============================
function alternarFormulario() {
  const isForm1Active = form1 && form1.classList.contains("active-form");

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
    watchPlanoSaudeSection();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 50);
}

toggleButtons.forEach((button) => {
  button.addEventListener("click", alternarFormulario);
});

// ===============================
// COLETA DE DADOS
// ===============================
function getFormDataObject(targetForm) {
  const formData = new FormData(targetForm);

  const baseData = {
    nome: formData.get("nome") || "",
    rg: formData.get("rg") || "",
    cpf: formData.get("cpf") || "",
    sexo: formData.get("sexo") || "",
    nascimento: formatDateBR(formData.get("nascimento") || ""),
    nomeMae: formData.get("nomeMae") || "",
    cep: formData.get("cep") || "",
    endereco: formData.get("endereco") || "",
    bairro: formData.get("bairro") || "",
    cidade: formData.get("cidade") || "",
    uf: formData.get("uf") || "",
    telefone: formData.get("telefone") || "",
    email: formData.get("email") || "",
  };

  if (targetForm.id === "cadastroForm1") {
    return {
      ...baseData,
      matricula: formData.get("matricula") || "",
      admissao: formatDateBR(formData.get("admissao") || ""),
      tipoSanguineo: formData.get("tipoSanguineo") || "",
      risp: formData.get("risp") || "",
      estadoCivil: formData.get("estadoCivil") || "",
      cargo: formData.get("cargo") || "",
      lotacao: formData.get("lotacao") || "",
      classe: formData.get("classe") || "",
      situacaoFuncional: formData.get("situacaoFuncional") || "",
      nomePai: formData.get("nomePai") || "",
    };
  }

  return {
    ...baseData,
    nomeAdicional: formData.get("nome_adicional") || "",
    rgAdicional: formData.get("rg_adicional") || "",
    cpfAdicional: formData.get("cpf_adicional") || "",
    sexoAdicional: formData.get("sexo_adicional") || "",
    nascimentoAdicional: formatDateBR(formData.get("nascimento_adicional") || ""),
    nomeMaeAdicional: formData.get("nomeMae_adicional") || "",
    cepAdicional: formData.get("cep_adicional") || "",
    enderecoAdicional: formData.get("endereco_adicional") || "",
    bairroAdicional: formData.get("bairro_adicional") || "",
    cidadeAdicional: formData.get("cidade_adicional") || "",
    ufAdicional: formData.get("uf_adicional") || "",
    telefoneAdicional: formData.get("telefone_adicional") || "",
    emailAdicional: formData.get("email_adicional") || "",
  };
}

function getFieldsForSections(targetForm, data) {
  if (targetForm.id === "cadastroForm1") {
    return [
      {
        title: "Dados pessoais",
        items: [
          ["Nome", data.nome],
          ["RG", data.rg],
          ["CPF", data.cpf],
          ["Matrícula Func.", data.matricula],
          ["Sexo", data.sexo],
          ["Data da admissão", data.admissao],
          ["Data do nascimento", data.nascimento],
          ["Tipo sanguíneo", data.tipoSanguineo],
          ["RISP", data.risp],
        ],
      },
      {
        title: "Dados para contato",
        items: [
          ["Endereço", data.endereco],
          ["CEP", data.cep],
          ["Bairro", data.bairro],
          ["Cidade", data.cidade],
          ["UF", data.uf],
          ["Telefone WhatsApp", data.telefone],
          ["E-mail", data.email],
        ],
      },
      {
        title: "Dados complementares",
        items: [
          ["Estado civil", data.estadoCivil],
          ["Cargo", data.cargo],
          ["Lotação", data.lotacao],
          ["Classe", data.classe],
          ["Situação funcional", data.situacaoFuncional],
          ["Nome da mãe", data.nomeMae],
          ["Nome do pai", data.nomePai],
        ],
      },
    ];
  }

  return {
    titular: [
      {
        title: "Dados pessoais do titular",
        items: [
          ["Nome", data.nome],
          ["RG", data.rg],
          ["CPF", data.cpf],
          ["Sexo", data.sexo],
          ["Data do nascimento", data.nascimento],
          ["Nome da mãe", data.nomeMae],
        ],
      },
      {
        title: "Dados para contato do titular",
        items: [
          ["CEP", data.cep],
          ["Endereço", data.endereco],
          ["Bairro", data.bairro],
          ["Cidade", data.cidade],
          ["UF", data.uf],
          ["Telefone WhatsApp", data.telefone],
          ["E-mail", data.email],
        ],
      },
    ],
    planoSaude: [
      {
        title: "Clube de Beneficios Planos de Saude",
        items: [
          ["Nome", data.nomeAdicional],
          ["RG", data.rgAdicional],
          ["CPF", data.cpfAdicional],
          ["Sexo", data.sexoAdicional],
          ["Data do nascimento", data.nascimentoAdicional],
          ["Nome da mãe", data.nomeMaeAdicional],
        ],
      },
      {
        title: "Contato do plano de saude",
        items: [
          ["CEP", data.cepAdicional],
          ["Endereço", data.enderecoAdicional],
          ["Bairro", data.bairroAdicional],
          ["Cidade", data.cidadeAdicional],
          ["UF", data.ufAdicional],
          ["Telefone WhatsApp", data.telefoneAdicional],
          ["E-mail", data.emailAdicional],
        ],
      },
    ],
  };
}

// ===============================
// PDF
// ===============================
function drawSectionTitle(doc, title, y) {
  doc.setFillColor(31, 78, 121);
  doc.roundedRect(14, y, 182, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 18, y + 5.4);
  doc.setTextColor(31, 41, 55);
  return y + 12;
}

function drawSubFormHeader(doc, title, subtitle, y) {
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, y, 182, 16, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, 18, y + 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(subtitle, 18, y + 11.8);

  doc.setTextColor(17, 24, 39);

  return y + 22;
}

function drawFieldCard(doc, label, value, x, y, width, minHeight = 16) {
  const normalizedValue = value && String(value).trim() ? String(value).trim() : "Não informado";
  const valueLines = doc.splitTextToSize(normalizedValue, width - 8);
  const dynamicHeight = Math.max(minHeight, 9 + (valueLines.length * 5.2));

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(x, y, width, dynamicHeight, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(label, x + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(valueLines, x + 4, y + 11);

  return dynamicHeight;
}

function renderSectionCards(doc, section, startY, columns = 2) {
  let y = drawSectionTitle(doc, section.title, startY);
  const gap = 6;
  const totalWidth = 182;
  const cardWidth = columns === 1 ? totalWidth : (totalWidth - gap) / 2;

  for (let i = 0; i < section.items.length; i += columns) {
    const rowItems = section.items.slice(i, i + columns);
    const heights = rowItems.map(([label, value], index) => {
      const x = 14 + index * (cardWidth + gap);
      return drawFieldCard(doc, label, value, x, y, cardWidth);
    });

    y += Math.max(...heights) + gap;
  }

  return y;
}

async function gerarPdfBlob(targetForm, data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataURL = await imageElementToDataURL(getHeaderImageElement(targetForm));
  const signatureDataURL = getSignatureDataURL(targetForm);
  const generatedAt = new Date().toLocaleString("pt-BR");
  const pdfFileName = getBaseFileName(targetForm, ".pdf");
  const sections = getFieldsForSections(targetForm, data);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 38, "F");
  doc.setFillColor(31, 78, 121);
  doc.rect(0, 38, 210, 8, "F");

  if (logoDataURL) {
    doc.addImage(logoDataURL, "PNG", 14, 8, 42, 20, undefined, "FAST");
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Formulario de Cadastro", 64, 17);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Resumo preenchido para envio e conferência", 64, 24);
  doc.setFontSize(9);
  doc.text(`Gerado em ${generatedAt}`, 64, 30);

  doc.setTextColor(17, 24, 39);
  let y = 54;

  if (targetForm.id === "cadastroForm1") {
    y = renderSectionCards(doc, sections[0], y, 2);
    y = renderSectionCards(doc, sections[1], y + 2, 2);

    const section3 = sections[2];

    if (y > 220) {
      doc.addPage();
      y = 18;
    }

    y = renderSectionCards(doc, section3, y + 2, 2);

    const dependentes = getDependentes();
    y += 2;
    y = drawSectionTitle(doc, "Dependentes", y);

    const body = dependentes.length
      ? dependentes.map((dep, index) => [
          String(index + 1),
          dep.nome || "Não informado",
          dep.parentesco || "Não informado",
          dep.nascimento || "Não informado",
        ])
      : [["-", "Nenhum dependente informado", "-", "-"]];

    doc.autoTable({
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["#", "Nome", "Parentesco", "Nascimento"]],
      body,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 2.4,
        textColor: [31, 41, 55],
        lineColor: [209, 213, 219],
        lineWidth: 0.2,
        valign: "middle",
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 14 },
        1: { cellWidth: 72 },
        2: { cellWidth: 58 },
        3: { halign: "center", cellWidth: 34 },
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  } else {
    y = drawSubFormHeader(
      doc,
      "Formulario Principal",
      "Dados do titular",
      y
    );

    y = renderSectionCards(doc, sections.titular[0], y, 2);
    y = renderSectionCards(doc, sections.titular[1], y + 2, 2);

    if (y > 180) {
      doc.addPage();
      y = 18;
    } else {
      y += 4;
    }

    y = drawSubFormHeader(
      doc,
      "Clube de Beneficios Planos de Saude",
      "Preenchimento separado dentro do mesmo PDF",
      y
    );

    y = renderSectionCards(doc, sections.planoSaude[0], y, 2);
    y = renderSectionCards(doc, sections.planoSaude[1], y + 2, 2);
  }

  if (y > 215) {
    doc.addPage();
    y = 18;
  }

  y = drawSectionTitle(doc, "Assinatura digital", y + 2);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(14, y, 182, 42, 3, 3, "FD");

  if (signatureDataURL) {
    doc.addImage(signatureDataURL, "PNG", 22, y + 5, 70, 24, undefined, "FAST");
    doc.setDrawColor(148, 163, 184);
    doc.line(22, y + 32, 104, y + 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(data.nome || "Assinante", 22, y + 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Assinatura digital do titular", 22, y + 41.5);
    doc.setTextColor(17, 24, 39);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Assinatura não informada.", 22, y + 20);
  }

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(118, y + 6, 68, 20, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Dados do arquivo", 124, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  addWrappedText(doc, `Arquivo: ${pdfFileName}`, 124, y + 18, 56, {
    lineHeightFactor: 1.2,
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Pagina ${page} de ${totalPages}`, 170, 290);
    doc.text("Sindpol & Grupo Blue", 14, 290);
  }

  return {
    blob: doc.output("blob"),
    fileName: pdfFileName,
  };
}

// ===============================
// SUBMIT
// ===============================
async function processarEnvio(targetForm) {
  if (!targetForm.checkValidity()) {
    targetForm.reportValidity();
    return;
  }

  const signaturePad = getActiveSignaturePad(targetForm);

  if (!signaturePad || signaturePad.isEmpty()) {
    alert("Por favor, faça a assinatura digital antes de enviar.");
    return;
  }

  const submitButton = targetForm.querySelector(".submit-btn");

  try {
    if (submitButton) {
      submitButton.textContent = "Gerando PDF...";
      submitButton.disabled = true;
    }

    targetForm.classList.add("loading");

    const data = getFormDataObject(targetForm);
    const { blob, fileName } = await gerarPdfBlob(targetForm, data);

    if (submitButton) {
      submitButton.textContent = "Baixando PDF...";
    }

    triggerBlobDownload(blob, fileName);

    alert("PDF gerado e baixado com sucesso.");
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Não foi possível gerar o PDF.");
  } finally {
    if (submitButton) {
      submitButton.textContent = "Enviar formulário";
      submitButton.disabled = false;
    }

    targetForm.classList.remove("loading");
  }
}

function handleSubmitForm1(event) {
  event.preventDefault();
  processarEnvio(form1);
}

function handleSubmitForm2(event) {
  event.preventDefault();
  processarEnvio(form2);
}

if (form1) {
  form1.addEventListener("submit", handleSubmitForm1);
}

if (form2) {
  form2.addEventListener("submit", handleSubmitForm2);
}

window.addEventListener("load", () => {
  watchPlanoSaudeSection();
});