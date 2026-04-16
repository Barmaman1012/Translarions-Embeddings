import { SectionTitle } from "@/components/section-title";
import { exploreMetrics, explorationHighlights } from "@/lib/mock-data";

export default function ExplorePage() {
  return (
    <div className="page">
      <SectionTitle
        eyebrow="Explore"
        title="Semantic comparison workspace"
        description="A placeholder view for future embedding inspection tools, nearest-neighbor exploration, and passage-level similarity visualizations."
      />

      <section className="section grid grid--cards">
        {exploreMetrics.map((metric) => (
          <article key={metric.label} className="metric">
            <h3>{metric.label}</h3>
            <p className="metric__value">{metric.value}</p>
            <p>{metric.description}</p>
          </article>
        ))}
      </section>

      <section className="section">
        <article className="placeholder-panel">
          <h3>Planned exploration capabilities</h3>
          <ul className="placeholder-list">
            {explorationHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
