"use client";

import { useState, useRef } from "react";
import { Upload, File, AlertCircle, CheckCircle } from "lucide-react";

interface MedicalFileDropzoneProps {
  patientId: string;
}

interface UploadStep {
  step: number;
  message: string;
  status: "pending" | "in-progress" | "completed" | "error";
}

export default function MedicalFileDropzone({ patientId }: MedicalFileDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadStep[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUploadSteps = () => {
    setUploadProgress([
      { step: 1, message: "Solicitando URL pre-firmada...", status: "pending" },
      { step: 2, message: "Subiendo archivo a S3/MinIO...", status: "pending" },
      { step: 3, message: "Confirmando subida en backend...", status: "pending" },
    ]);
  };

  const updateStepStatus = (stepIndex: number, status: UploadStep["status"], message?: string) => {
    setUploadProgress(prev => prev.map((step, index) => {
      if (index === stepIndex) {
        return {
          ...step,
          status,
          message: message || step.message,
        };
      }
      return step;
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("El archivo es demasiado grande. Máximo 10MB.");
      return;
    }

    // Validar tipo de archivo (solo imágenes y PDFs)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "text/plain",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Tipo de archivo no permitido. Solo se aceptan imágenes, PDFs y archivos de texto.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Por favor selecciona un archivo primero.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    resetUploadSteps();

    try {
      // Paso 1: Solicitar URL pre-firmada
      updateStepStatus(0, "in-progress");
      const presignResponse = await fetch(`/api/patients/${patientId}/files/presign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_name: selectedFile.name,
          content_type: selectedFile.type,
        }),
      });

      if (!presignResponse.ok) {
        const errorData = await presignResponse.json();
        throw new Error(errorData.error || "Error al solicitar URL pre-firmada");
      }

      const presignData = await presignResponse.json();
      const { upload_url: presignedUrl, object_key: objectKey } = presignData;
      updateStepStatus(0, "completed", "URL pre-firmada obtenida");

      // Paso 2: Subir archivo directamente a S3/MinIO
      updateStepStatus(1, "in-progress");
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
          // NOTA: No enviamos cookies aquí para evitar errores CORS con S3
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error al subir archivo a S3: ${uploadResponse.statusText}`);
      }

      updateStepStatus(1, "completed", "Archivo subido a S3/MinIO");

      // Paso 3: Confirmar subida en el backend
      updateStepStatus(2, "in-progress");
      const confirmResponse = await fetch(`/api/patients/${patientId}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_name: selectedFile.name,
          content_type: selectedFile.type,
          size: selectedFile.size,
          object_key: objectKey,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || "Error al confirmar subida en backend");
      }

      updateStepStatus(2, "completed", "Subida confirmada en backend");

      // Éxito
      setSuccess(`Archivo "${selectedFile.name}" subido exitosamente.`);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error en subida de archivo:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al subir archivo");
      
      // Marcar todos los pasos pendientes como error
      setUploadProgress(prev => prev.map(step => {
        if (step.status === "in-progress" || step.status === "pending") {
          return { ...step, status: "error" };
        }
        return step;
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    // Simular el cambio en el input de archivo
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      const changeEvent = new Event("change", { bubbles: true });
      fileInputRef.current.dispatchEvent(changeEvent);
    }
  };

  const getStepIcon = (status: UploadStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "in-progress":
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "pending":
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          Subir Archivo Médico
        </h2>
        <p className="text-gray-600 dark:text-slate-300 mt-2">
          Sube documentos médicos como imágenes, PDFs o archivos de texto. Máximo 10MB.
        </p>
      </div>

      {/* Zona de arrastrar y soltar */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          selectedFile
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".jpg,.jpeg,.png,.gif,.pdf,.txt"
        />
        
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <File className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>

          <div>
            <p className="text-lg font-medium text-gray-800 dark:text-slate-100">
              {selectedFile ? selectedFile.name : "Arrastra y suelta tu archivo aquí"}
            </p>
            <p className="text-gray-500 dark:text-slate-400 mt-2">
              {selectedFile
                ? `Tamaño: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : "o haz clic para seleccionar"}
            </p>
          </div>
        </div>
      </div>

      {/* Pasos de subida */}
      {isUploading && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4">
            Progreso de subida
          </h3>
          <div className="space-y-4">
            {uploadProgress.map((step) => (
              <div
                key={step.step}
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
              >
                {getStepIcon(step.status)}
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-slate-100">
                    Paso {step.step}: {step.message}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        step.status === "completed"
                          ? "bg-green-500 w-full"
                          : step.status === "in-progress"
                          ? "bg-blue-500 w-1/2"
                          : step.status === "error"
                          ? "bg-red-500 w-full"
                          : "bg-gray-300 dark:bg-slate-600 w-0"
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <p className="font-medium">{success}</p>
          </div>
        </div>
      )}

      {/* Botón de subida */}
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isUploading || !selectedFile
              ? "bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isUploading ? "Subiendo..." : "Subir Archivo"}
        </button>
      </div>
    </div>
  );
}