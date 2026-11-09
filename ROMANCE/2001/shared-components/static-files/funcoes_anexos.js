// ===============================
// FUNÇÕES DE ANEXOS - GLOBAL
// ===============================
//
// Diego Piecho - 09/04/2026
// Esta função geralmente é usada em telas de anexos, para visualização de imagens e documentos tipo PDF, DOC, TXT
//
// Abrir imagem em nova aba (preview bonito)
window.abrirFoto = function(url) {
  const w = window.open("", "_blank");

  if (!w) {
    alert("Popup bloqueado pelo navegador.");
    return;
  }

  url = (url || "").trim();

  try {
    url = decodeURIComponent(url);
  } catch (e) {}

  const doc = w.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Visualizar imagem</title>
        <style>
          body {
            margin: 0;
            background: #111;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          img {
            max-width: 100%;
            max-height: 100vh;
            object-fit: contain;
          }
        </style>
      </head>
      <body></body>
    </html>
  `);
  doc.close();

  const img = doc.createElement("img");

  img.onload = function () {
    console.log("Imagem carregada:", url);
  };

  img.onerror = function () {
    doc.body.innerHTML = `
      <div style="color:#fff;font-family:Arial;padding:30px;text-align:center;">
        Erro ao carregar imagem<br><br>
        ${url}
      </div>
    `;
  };

  img.src = url;
  doc.body.appendChild(img);
};

//  Abrir arquivo (força abrir no browser)
window.abrirArquivo = function(url) {
  window.open(
    "https://docs.google.com/gview?embedded=true&url=" + encodeURIComponent(url),
    "_blank"
  );
};
//  Abrir arquivo (xml)
window.abrirArquivoxml = function(url) {
  window.open(url, "_blank");
};