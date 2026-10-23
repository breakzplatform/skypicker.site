import type { SiteContent } from "@/lib/site"

export function Faq({ content }: { content: SiteContent["faq"] }) {
  return (
    <section className="db-panel cast mb-6 mt-6" aria-labelledby="faq-title">
      <h2 className="db-panel-head" id="faq-title">
        <span>{content.title}</span>
      </h2>
      <div className="faq-list">
        {content.items.map(({ question, answer }) => (
          <details className="faq-item" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
