import { useState } from "react";
import { api } from "../api";

interface UploadResult {
  url: string;
  originalName: string;
}

interface Props {
  value: string;
  onChange: (url: string) => void;
}

// Anexo de certificado (A2): upload real de arquivo, guardado em disco no
// servidor — não é mais um campo de texto onde o usuário digita uma URL.
export function FileUploadField({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await api.upload<UploadResult>("/uploads", file);
      onChange(result.url);
      setFileName(result.originalName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleChange} disabled={uploading} />
      {uploading && <p className="small muted">Enviando...</p>}
      {error && <p className="small" style={{ color: "var(--danger)" }}>{error}</p>}
      {value && !uploading && (
        <p className="small">
          <a href={value} target="_blank" rel="noreferrer">
            {fileName ?? "Ver arquivo anexado"}
          </a>
        </p>
      )}
    </div>
  );
}
