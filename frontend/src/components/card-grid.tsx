type CardItem = {
  title: string;
  description: string;
};

type CardGridProps = {
  items: CardItem[];
};

export function CardGrid({ items }: CardGridProps) {
  return (
    <div className="grid grid--cards">
      {items.map((item) => (
        <article key={item.title} className="card">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </article>
      ))}
    </div>
  );
}
