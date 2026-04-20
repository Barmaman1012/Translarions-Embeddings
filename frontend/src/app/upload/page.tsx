import { UploadWorkspace } from "@/components/upload/upload-workspace";

export default function UploadPage() {
  return (
    <UploadWorkspace
      heading="Ingestion Lab"
      description="A standalone testing surface for upload and paste workflows. The primary product path now lives inside each project workspace under the Ingestion stage."
      note="Use this page when you want to test ingestion without opening a specific project."
    />
  );
}
