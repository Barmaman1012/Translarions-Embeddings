import { SectionTitle } from "@/components/section-title";
import { uploadChecklist } from "@/lib/mock-data";

export default function UploadPage() {
  return (
    <div className="page">
      <SectionTitle
        eyebrow="Upload"
        title="Prepare a text ingestion run"
        description="This page is a UI placeholder for the future upload flow. It outlines the metadata and processing decisions the real application will capture."
      />

      <section className="section grid grid--cards">
        <article className="placeholder-panel">
          <h3>Planned form fields</h3>
          <div className="pill-row">
            <span className="pill">Project title</span>
            <span className="pill">Source language</span>
            <span className="pill">Translation files</span>
            <span className="pill">Segmentation mode</span>
            <span className="pill">Notes</span>
          </div>
        </article>

        <article className="placeholder-panel">
          <h3>Upload checklist</h3>
          <ol className="placeholder-list">
            {uploadChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}
