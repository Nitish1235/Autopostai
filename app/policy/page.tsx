export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-20 px-6">
            <div className="max-w-3xl mx-auto prose prose-invert">
                <h1 className="text-4xl font-bold mb-8 text-[var(--text-primary)]">Privacy Policy</h1>
                <p className="text-[var(--text-secondary)] mb-6">Last updated: {new Date().toLocaleDateString()}</p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">1. Information We Collect</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    When you use AutoPost AI, we collect information you provide directly to us, such as when you create an account, connect social media profiles, or contact customer support. We use Google OAuth for authentication, which provides us with your email address and basic profile information.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">2. How We Use Your Information</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    We use the information we collect to provide, maintain, and improve our services. Specifically, we use your social media connections solely to publish video content on your behalf, as requested through our application interface.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">3. Data Sharing and Third Parties</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    We do not sell your personal data. We share data with third-party vendors (such as AI generation APIs and hosting providers) only as necessary to provide our core video generation and publishing services. We abide by the API Terms of Service for YouTube, TikTok, and other integrated platforms.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">4. Data Retention and Deletion</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    We retain your information as long as your account is active. You can request account deletion at any time by contacting support. Upon deletion, we will remove your personal data and revoke all stored social media connection tokens.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4 text-[var(--text-primary)]">5. Contact Us</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    If you have questions about this Privacy Policy, please contact us at support@autopostai.video.
                </p>
            </div>
        </div>
    )
}
