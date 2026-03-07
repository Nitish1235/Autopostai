"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WelcomeEmail = WelcomeEmail;
exports.sendWelcomeEmail = sendWelcomeEmail;
const jsx_runtime_1 = require("react/jsx-runtime");
const components_1 = require("@react-email/components");
const resend_1 = require("resend");
// ── Email Template ────────────────────────────────────
function WelcomeEmail({ name }) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com';
    return ((0, jsx_runtime_1.jsxs)(components_1.Html, { children: [(0, jsx_runtime_1.jsx)(components_1.Head, {}), (0, jsx_runtime_1.jsx)(components_1.Preview, { children: "Welcome to AutoPost AI \u2014 3 free videos inside" }), (0, jsx_runtime_1.jsx)(components_1.Body, { style: bodyStyle, children: (0, jsx_runtime_1.jsxs)(components_1.Container, { style: containerStyle, children: [(0, jsx_runtime_1.jsx)(components_1.Section, { style: logoSectionStyle, children: (0, jsx_runtime_1.jsx)("table", { cellPadding: "0", cellSpacing: "0", role: "presentation", children: (0, jsx_runtime_1.jsx)("tbody", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { style: {
                                                    width: '28px',
                                                    height: '28px',
                                                    backgroundColor: '#0A84FF',
                                                    borderRadius: '6px',
                                                    textAlign: 'center',
                                                    verticalAlign: 'middle',
                                                }, children: (0, jsx_runtime_1.jsx)("span", { style: { color: '#FFFFFF', fontSize: '12px' }, children: "\u25B6" }) }), (0, jsx_runtime_1.jsx)("td", { style: { paddingLeft: '9px' }, children: (0, jsx_runtime_1.jsx)("span", { style: {
                                                        color: '#F5F5F7',
                                                        fontSize: '15px',
                                                        fontWeight: 700,
                                                        fontFamily: 'Inter, system-ui, sans-serif',
                                                    }, children: "AutoPost AI" }) })] }) }) }) }), (0, jsx_runtime_1.jsxs)(components_1.Heading, { style: headingStyle, children: ["Welcome to AutoPost AI, ", name] }), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: textStyle, children: ["You have ", (0, jsx_runtime_1.jsx)("strong", { style: { color: '#0A84FF' }, children: "3 free videos" }), ' ', "to get started. Here's how it works:"] }), (0, jsx_runtime_1.jsx)(components_1.Hr, { style: hrStyle }), (0, jsx_runtime_1.jsxs)(components_1.Section, { style: stepSectionStyle, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: stepNumberStyle, children: "1" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: stepTitleStyle, children: "Pick a topic" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: stepDescStyle, children: "Type any topic \u2014 finance, history, science \u2014 or let AI suggest trending topics for your niche." })] }), (0, jsx_runtime_1.jsxs)(components_1.Section, { style: stepSectionStyle, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: stepNumberStyle, children: "2" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: stepTitleStyle, children: "AI generates everything" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: stepDescStyle, children: "Script, images, voiceover, subtitles, and music \u2014 all created automatically in under 8 minutes." })] }), (0, jsx_runtime_1.jsxs)(components_1.Section, { style: stepSectionStyle, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: stepNumberStyle, children: "3" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: stepTitleStyle, children: "Auto-publish everywhere" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: stepDescStyle, children: "Your video is posted to TikTok, Instagram, YouTube Shorts, and X \u2014 on your schedule or full autopilot." })] }), (0, jsx_runtime_1.jsx)(components_1.Hr, { style: hrStyle }), (0, jsx_runtime_1.jsx)(components_1.Section, { style: { textAlign: 'center', marginTop: '32px' }, children: (0, jsx_runtime_1.jsx)(components_1.Link, { href: `${appUrl}/create`, style: ctaButtonStyle, children: "Create your first video \u2192" }) }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: footerStyle, children: "You're receiving this because you signed up for AutoPost AI. If this wasn't you, you can safely ignore this email." })] }) })] }));
}
// ── Styles ────────────────────────────────────────────
const bodyStyle = {
    backgroundColor: '#1C1C1E',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    margin: 0,
    padding: 0,
};
const containerStyle = {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '48px 32px',
};
const logoSectionStyle = {
    marginBottom: '32px',
};
const headingStyle = {
    color: '#F5F5F7',
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: 1.3,
    margin: '0 0 16px',
    letterSpacing: '-0.5px',
};
const textStyle = {
    color: 'rgba(245, 245, 247, 0.6)',
    fontSize: '15px',
    lineHeight: 1.6,
    margin: '0 0 8px',
};
const hrStyle = {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: '1px 0 0',
    margin: '24px 0',
};
const stepSectionStyle = {
    marginBottom: '20px',
};
const stepNumberStyle = {
    display: 'inline-block',
    width: '28px',
    height: '28px',
    lineHeight: '28px',
    textAlign: 'center',
    borderRadius: '50%',
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    border: '1px solid rgba(10, 132, 255, 0.25)',
    color: '#0A84FF',
    fontSize: '13px',
    fontWeight: 700,
    margin: '0 0 8px',
};
const stepTitleStyle = {
    color: '#F5F5F7',
    fontSize: '15px',
    fontWeight: 600,
    margin: '0 0 4px',
};
const stepDescStyle = {
    color: 'rgba(245, 245, 247, 0.45)',
    fontSize: '13px',
    lineHeight: 1.6,
    margin: 0,
};
const ctaButtonStyle = {
    display: 'inline-block',
    backgroundColor: '#0A84FF',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    padding: '13px 28px',
    borderRadius: '8px',
    lineHeight: 1,
};
const footerStyle = {
    color: 'rgba(245, 245, 247, 0.2)',
    fontSize: '11px',
    lineHeight: 1.6,
    marginTop: '48px',
    textAlign: 'center',
};
// ── Send Function ─────────────────────────────────────
async function sendWelcomeEmail(email, name) {
    const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 'dummy_key');
    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
        to: email,
        subject: 'Welcome to AutoPost AI — 3 free videos inside',
        react: WelcomeEmail({ name }),
    });
}
