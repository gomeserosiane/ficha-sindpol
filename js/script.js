// ===============================
// ELEMENTOS DOM
// ===============================
const form1 = document.getElementById("cadastroForm1");
const form2 = document.getElementById("cadastroForm2");

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
// PALETA / TEMA
// ===============================
const THEME = {
  blue: "1F4E79",
  blueSoft: "DCEAF7",
  blueMid: "5B9BD5",
  dark: "1F2937",
  gray: "6B7280",
  light: "F8FAFC",
  border: "D1D5DB",
  white: "FFFFFF",
  green: "0F766E",
};

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

function getBaseFileName(targetForm) {
  const nomeInput = targetForm.querySelector('input[name="nome"]');
  const nome = nomeInput ? nomeInput.value.trim() : "";
  const safeName = sanitizeFileName(nome || "formulario");
  const timestamp = getFormattedToday();
  const formType = targetForm.id === "cadastroForm1" ? "completo" : "alternativo";
  return `ficha_${formType}_${safeName}_${timestamp}`;
}

function getActiveSignaturePad(targetForm) {
  return targetForm.id === "cadastroForm1" ? signaturePad1 : signaturePad2;
}

function getFormTypeLabel(targetForm) {
  return targetForm.id === "cadastroForm1"
    ? "Formulário Completo"
    : "Formulário Alternativo";
}

function getHeaderImageElement(targetForm) {
  return targetForm.querySelector(".header-image");
}

function getHeaderTitleText(targetForm) {
  const titles = [...targetForm.querySelectorAll(".header-content h1")].map(el => el.textContent.trim()).filter(Boolean);
  return titles.join(" • ");
}

function getHeaderSubtitleText(targetForm) {
  const subtitle = targetForm.querySelector(".header-content h2");
  return subtitle ? subtitle.textContent.trim() : "";
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

function autoFitColumns(worksheet, minWidth = 14, maxWidth = 45) {
  worksheet.columns.forEach((column) => {
    let maxLength = minWidth;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const raw = cell.value;
      let cellValue = "";

      if (raw === null || raw === undefined) {
        cellValue = "";
      } else if (typeof raw === "object" && raw.richText) {
        cellValue = raw.richText.map((r) => r.text).join("");
      } else {
        cellValue = String(raw);
      }

      const lines = cellValue.split("\n");
      lines.forEach((line) => {
        maxLength = Math.max(maxLength, line.length + 2);
      });
    });

    column.width = Math.min(maxLength, maxWidth);
  });
}

function applyCellBorder(cell) {
  cell.border = {
    top: { style: "thin", color: { argb: THEME.border } },
    left: { style: "thin", color: { argb: THEME.border } },
    bottom: { style: "thin", color: { argb: THEME.border } },
    right: { style: "thin", color: { argb: THEME.border } },
  };
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

  return baseData;
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

  return [
    {
      title: "Dados pessoais",
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
      title: "Dados para contato",
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
  ];
}

// ===============================
// EXCEL PREMIUM
// ===============================
async function gerarExcel(targetForm, data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ChatGPT";
  workbook.company = "OpenAI";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = getFormTypeLabel(targetForm);
  workbook.title = `${getFormTypeLabel(targetForm)} - ${data.nome || "Sem nome"}`;

  const logoDataURL = await imageElementToDataURL(getHeaderImageElement(targetForm));
  const signatureDataURL = getSignatureDataURL(targetForm);

  // -------------------------------
  // ABA PRINCIPAL
  // -------------------------------
  const ws = workbook.addWorksheet("Cadastro", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  ws.properties.tabColor = { argb: THEME.blue };

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = getHeaderTitleText(targetForm) || getFormTypeLabel(targetForm);
  ws.getCell("A1").font = { name: "Calibri", size: 16, bold: true, color: { argb: THEME.white } };
  ws.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: THEME.blue },
  };
  ws.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = getHeaderSubtitleText(targetForm) || "Cadastro gerado automaticamente";
  ws.getCell("A2").font = { name: "Calibri", size: 11, italic: true, color: { argb: THEME.dark } };
  ws.getCell("A2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: THEME.blueSoft },
  };
  ws.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(2).height = 22;

  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = `Gerado em ${new Date().toLocaleString("pt-BR")}`;
  ws.getCell("A3").font = { name: "Calibri", size: 10, color: { argb: THEME.gray } };
  ws.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(3).height = 18;

  let currentRow = 5;

  const sections = getFieldsForSections(targetForm, data);
  sections.forEach((section) => {
    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = section.title.toUpperCase();
    titleCell.font = { bold: true, color: { argb: THEME.white }, size: 11 };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: THEME.green },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    ws.getRow(currentRow).height = 20;
    currentRow++;

    section.items.forEach(([label, value]) => {
      ws.getCell(`A${currentRow}`).value = label;
      ws.getCell(`A${currentRow}`).font = { bold: true, color: { argb: THEME.dark } };
      ws.getCell(`A${currentRow}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F3F4F6" },
      };

      ws.mergeCells(`B${currentRow}:D${currentRow}`);
      ws.getCell(`B${currentRow}`).value = value || "-";
      ws.getCell(`B${currentRow}`).alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };

      applyCellBorder(ws.getCell(`A${currentRow}`));
      applyCellBorder(ws.getCell(`B${currentRow}`));
      applyCellBorder(ws.getCell(`C${currentRow}`));
      applyCellBorder(ws.getCell(`D${currentRow}`));

      ws.getRow(currentRow).height = 20;
      currentRow++;
    });

    currentRow++;
  });

  if (logoDataURL) {
    const logoId = workbook.addImage({
      base64: logoDataURL,
      extension: "png",
    });

    ws.addImage(logoId, {
      tl: { col: 3.1, row: 0.15 },
      ext: { width: 150, height: 55 },
    });
  }

  // -------------------------------
  // ABA DEPENDENTES
  // -------------------------------
  if (targetForm.id === "cadastroForm1") {
    const dependentes = getDependentes();
    const depWs = workbook.addWorksheet("Dependentes", {
      views: [{ state: "frozen", ySplit: 3 }],
    });
    depWs.properties.tabColor = { argb: THEME.green };

    depWs.mergeCells("A1:D1");
    depWs.getCell("A1").value = "DEPENDENTES";
    depWs.getCell("A1").font = { name: "Calibri", size: 15, bold: true, color: { argb: THEME.white } };
    depWs.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: THEME.blue },
    };
    depWs.alignment = { vertical: "middle", horizontal: "left" };
    depWs.getRow(1).height = 26;

    depWs.mergeCells("A2:D2");
    depWs.getCell("A2").value = `Titular: ${data.nome || "-"}`;
    depWs.getCell("A2").font = { italic: true, color: { argb: THEME.gray } };
    depWs.getRow(2).height = 18;

    const headerRow = depWs.getRow(4);
    ["#", "Nome", "Parentesco", "Data de nascimento"].forEach((title, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = title;
      cell.font = { bold: true, color: { argb: THEME.white } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: THEME.green },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      applyCellBorder(cell);
    });
    headerRow.height = 22;

    if (dependentes.length) {
      dependentes.forEach((dep, index) => {
        const row = depWs.getRow(5 + index);
        row.values = [index + 1, dep.nome || "-", dep.parentesco || "-", dep.nascimento || "-"];
        row.height = 20;

        row.eachCell((cell) => {
          applyCellBorder(cell);
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        });

        if (index % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8FAFC" },
            };
          });
        }
      });
    } else {
      const row = depWs.getRow(5);
      row.values = ["", "Nenhum dependente informado", "", ""];
      row.eachCell((cell) => {
        applyCellBorder(cell);
      });
    }

    autoFitColumns(depWs, 12, 35);
  }

  // -------------------------------
  // ABA ASSINATURA
  // -------------------------------
  const signWs = workbook.addWorksheet("Assinatura");
  signWs.properties.tabColor = { argb: THEME.blueMid };

  signWs.mergeCells("A1:D1");
  signWs.getCell("A1").value = "ASSINATURA DIGITAL";
  signWs.getCell("A1").font = { size: 15, bold: true, color: { argb: THEME.white } };
  signWs.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: THEME.blue },
  };
  signWs.getRow(1).height = 26;

  signWs.mergeCells("A2:D2");
  signWs.getCell("A2").value = `Assinante: ${data.nome || "-"}`;
  signWs.getCell("A2").font = { italic: true, color: { argb: THEME.gray } };

  if (signatureDataURL) {
    const signImageId = workbook.addImage({
      base64: signatureDataURL,
      extension: "png",
    });

    signWs.addImage(signImageId, {
      tl: { col: 0.3, row: 3 },
      ext: { width: 320, height: 120 },
    });

    signWs.getCell("A11").value = "Assinatura capturada no formulário.";
    signWs.getCell("A11").font = { color: { argb: THEME.gray } };
  } else {
    signWs.getCell("A4").value = "Assinatura não informada.";
  }

  ws.columns = [
    { key: "a", width: 24 },
    { key: "b", width: 24 },
    { key: "c", width: 24 },
    { key: "d", width: 24 },
  ];

  autoFitColumns(ws, 16, 38);
  autoFitColumns(signWs, 16, 35);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob(
    [buffer],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );

  triggerBlobDownload(blob, `${getBaseFileName(targetForm)}.xlsx`);
}

// ===============================
// PDF PREMIUM
// ===============================
function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 5) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
}

function ensurePageSpace(doc, y, required = 18) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + required > pageHeight - 15) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawSectionHeader(doc, title, y) {
  doc.setFillColor(31, 78, 121);
  doc.roundedRect(12, y - 6, 186, 10, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 16, y);
  return y + 8;
}

function drawLabelValue(doc, label, value, y) {
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.text(`${label}:`, 16, y);

  doc.setFont("helvetica", "normal");
  const nextY = addWrappedText(doc, value || "-", 52, y, 140, 5);
  return Math.max(nextY, y + 6);
}

function drawDependentesTable(doc, dependentes, startY) {
  let y = startY;

  const colX = [16, 28, 100, 148];
  const colW = [12, 72, 48, 42];
  const rowH = 9;

  doc.setFillColor(15, 118, 110);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.rect(colX[0], y - 6, colW[0], rowH, "F");
  doc.rect(colX[1], y - 6, colW[1], rowH, "F");
  doc.rect(colX[2], y - 6, colW[2], rowH, "F");
  doc.rect(colX[3], y - 6, colW[3], rowH, "F");

  doc.text("#", colX[0] + 4, y);
  doc.text("Nome", colX[1] + 2, y);
  doc.text("Parentesco", colX[2] + 2, y);
  doc.text("Nascimento", colX[3] + 2, y);
  y += 9;

  doc.setTextColor(31, 41, 55);
  doc.setFont("helvetica", "normal");

  if (!dependentes.length) {
    doc.rect(colX[0], y - 6, 174, rowH);
    doc.text("Nenhum dependente informado.", 18, y);
    return y + 10;
  }

  dependentes.forEach((dep, index) => {
    y = ensurePageSpace(doc, y, 12);

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(colX[0], y - 6, 174, rowH, "F");
    }

    doc.setDrawColor(209, 213, 219);
    doc.rect(colX[0], y - 6, colW[0], rowH);
    doc.rect(colX[1], y - 6, colW[1], rowH);
    doc.rect(colX[2], y - 6, colW[2], rowH);
    doc.rect(colX[3], y - 6, colW[3], rowH);

    doc.text(String(index + 1), colX[0] + 4, y);
    doc.text((dep.nome || "-").slice(0, 34), colX[1] + 2, y);
    doc.text((dep.parentesco || "-").slice(0, 20), colX[2] + 2, y);
    doc.text(dep.nascimento || "-", colX[3] + 2, y);

    y += 9;
  });

  return y;
}

async function gerarPDF(targetForm, data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const logoDataURL = await imageElementToDataURL(getHeaderImageElement(targetForm));
  const signatureDataURL = getSignatureDataURL(targetForm);

  let y = 14;

  // Cabeçalho premium
  doc.setFillColor(31, 78, 121);
  doc.rect(0, 0, 210, 32, "F");

  if (logoDataURL) {
    try {
      doc.addImage(logoDataURL, "PNG", 12, 6, 36, 18);
    } catch (error) {
      console.error("Erro ao inserir logo no PDF:", error);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(getFormTypeLabel(targetForm), 55, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(getHeaderTitleText(targetForm).slice(0, 80), 55, 19);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 55, 24);

  y = 40;

  const sections = getFieldsForSections(targetForm, data);

  sections.forEach((section) => {
    y = ensurePageSpace(doc, y, 18);
    y = drawSectionHeader(doc, section.title, y);

    section.items.forEach(([label, value]) => {
      y = ensurePageSpace(doc, y, 12);
      y = drawLabelValue(doc, label, value, y);
    });

    y += 3;
  });

  if (targetForm.id === "cadastroForm1") {
    const dependentes = getDependentes();
    y = ensurePageSpace(doc, y, 25);
    y = drawSectionHeader(doc, "Dependentes", y);
    y = drawDependentesTable(doc, dependentes, y);
  }

  y = ensurePageSpace(doc, y, 50);
  y += 4;
  y = drawSectionHeader(doc, "Assinatura digital", y);

  if (signatureDataURL) {
    try {
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(16, y - 2, 78, 34, 2, 2);
      doc.addImage(signatureDataURL, "PNG", 18, y, 74, 28);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(10);
      doc.text(data.nome || "Assinante", 16, y + 38);
    } catch (error) {
      console.error("Erro ao inserir assinatura no PDF:", error);
      doc.text("Não foi possível renderizar a assinatura.", 16, y + 5);
    }
  } else {
    doc.setTextColor(31, 41, 55);
    doc.text("Assinatura não informada.", 16, y + 5);
  }

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(220, 234, 247);
    doc.line(12, 287, 198, 287);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Página ${i} de ${pageCount}`, 170, 292);
  }

  doc.save(`${getBaseFileName(targetForm)}.pdf`);
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
      submitButton.textContent = "Gerando Excel e PDF...";
      submitButton.disabled = true;
    }

    targetForm.classList.add("loading");

    const data = getFormDataObject(targetForm);

    await gerarExcel(targetForm, data);
    await gerarPDF(targetForm, data);

    alert("Planilha Excel e PDF gerados com sucesso.");
  } catch (error) {
    console.error("Erro ao gerar arquivos:", error);
    alert("Não foi possível gerar os arquivos Excel e PDF.");
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