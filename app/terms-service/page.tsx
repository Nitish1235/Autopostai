export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-20 px-6">
            <div className="max-w-3xl mx-auto prose prose-invert">
                <h1 className="text-4xl font-bold mb-8 text-[var(--text-primary)]">Terms of Service</h1>
                <p className="text-[var(--text-secondary)] mb-6">Last updated: {new Date().toLocaleDateString()}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">1. Acceptance of Terms</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    By accessing and using AutoPost AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">2. Description of Service</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    AutoPost AI is an automated video generation and publishing platform. We provide tools to create short-form video content using AI and publish it to connected social media accounts. Service fees are billed via DodoPayments according to your selected subscription tier.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">3. User Responsibilities</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    You are solely responsible for the content generated and posted through your account. You agree not to use the service to generate illegal, hateful, or explicit content. You must comply with the terms of service of any social media platforms (TikTok, YouTube, etc.) you connect to our service.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">4. Intellectual Property</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    You retain rights to the videos generated using your account. AutoPost AI retains all rights to the underlying technology, platform design, and software used to provide the service.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">5. Termination</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    We reserve the right to suspend or terminate your account at any time for violations of these Terms of Service or for any conduct that we determine is inappropriate or harmful to our platform or other users.
                </p>
            </div>
        </div>
    )
}
