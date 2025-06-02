import fitz  # PyMuPDF

def extraer_texto_pdf(nombre_archivo, salida_txt):
    doc = fitz.open(nombre_archivo)
    texto = ""
    for pagina in doc:
        texto += pagina.get_text()
    with open(salida_txt, "w", encoding="utf-8") as f:
        f.write(texto)
    print(f"Texto extraído a: {salida_txt}")

extraer_texto_pdf("aborto.pdf", "aborto.txt")
extraer_texto_pdf("Eutanasia.pdf", "eutanasia.txt")
