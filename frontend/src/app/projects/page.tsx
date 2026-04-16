import { SectionTitle } from "@/components/section-title";
import { projectSummaries } from "@/lib/mock-data";

export default function ProjectsPage() {
  return (
    <div className="page">
      <SectionTitle
        eyebrow="Projects"
        title="Research workspaces"
        description="A placeholder index of translation comparison projects. This will later become the main entry point for managing texts, translations, and analysis runs."
      />

      <section className="section">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Source Language</th>
              <th>Translations</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {projectSummaries.map((project) => (
              <tr key={project.name}>
                <td>{project.name}</td>
                <td>{project.sourceLanguage}</td>
                <td>{project.translationCount}</td>
                <td>{project.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
