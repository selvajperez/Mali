export function crearArchivos(blobs: Blob[]): File[] {
  return blobs.map(
    (blob, i) =>
      new File(
        [blob],
        blobs.length > 1 ? `mute-publicacion-placa-${i + 1}.jpg` : "mute-publicacion.jpg",
        { type: "image/jpeg" }
      )
  );
}

export function puedeCompartir(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

// Ojo: canShare()===true no garantiza que la app elegida por el usuario en
// el menú del sistema acepte varios archivos a la vez; solo indica que el
// propio navegador puede intentar entregarlos.
export function puedeCompartirVarios(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

export type ResultadoCompartir = "compartido" | "no-disponible" | "cancelado" | "error";

export async function compartirArchivos(
  files: File[],
  texto: string,
  titulo: string
): Promise<ResultadoCompartir> {
  if (!puedeCompartir()) return "no-disponible";

  const data: ShareData = { files, text: texto, title: titulo };
  if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
    return "no-disponible";
  }

  try {
    await navigator.share(data);
    return "compartido";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelado";
    return "error";
  }
}

export function descargarArchivo(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copiarTexto(texto: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // sigue al fallback
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = texto;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
