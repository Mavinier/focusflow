type PlaceholderPageProps = {
  eyebrow: string
  title: string
  copy: string
}

function PlaceholderPage({ copy, eyebrow, title }: PlaceholderPageProps) {
  return (
    <div className="page-content">
      <section className="intro">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="intro-copy">{copy}</p>
        </div>
      </section>
    </div>
  )
}

export default PlaceholderPage
