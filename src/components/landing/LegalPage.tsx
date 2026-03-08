import Link from 'next/link';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';

interface LegalSection {
  title: string;
  content?: string;
  items?: string[];
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export default function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
  return (
    <div className="landing-dark min-h-screen bg-[#0C0C0C] text-white">
      <LandingHeader />
      <main className="pb-24 pt-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12">
            <Link
              href="/"
              className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-white"
            >
              <span aria-hidden="true">&larr;</span> Back
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-neutral-500">Last updated: {lastUpdated}</p>
          </div>

          <div className="space-y-10">
            {sections.map((section, i) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-lg font-semibold text-white">
                  {i + 1}. {section.title}
                </h2>
                {section.content && (
                  <p className="text-sm leading-relaxed text-neutral-400">{section.content}</p>
                )}
                {section.items && (
                  <ul className="space-y-1.5 pl-5">
                    {section.items.map((item) => (
                      <li key={item} className="list-disc text-sm leading-relaxed text-neutral-400">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
