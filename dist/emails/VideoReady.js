"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoReadyEmail = VideoReadyEmail;
exports.sendVideoReadyEmail = sendVideoReadyEmail;
const jsx_runtime_1 = require("react/jsx-runtime");
const components_1 = require("@react-email/components");
const resend_1 = require("resend");
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com';
// ── Email Template ────────────────────────────────────
function VideoReadyEmail({ name, videoTitle, videoId, thumbnailUrl, approvalMode, }) {
    const isReview = approvalMode === 'review';
    const previewText = isReview
        ? `Review required: ${videoTitle}`
        : `Video queued: ${videoTitle}`;
    const heading = isReview
        ? 'Your video is ready to review'
        : 'Your video is queued for posting';
    const body = isReview
        ? `"${videoTitle}" is ready. You have 24 hours to approve or reject before autopilot skips it.`
        : `"${videoTitle}" will be posted as scheduled.`;
    const ctaText = isReview ? 'Review Video →' : 'View Video →';
    const ctaHref = isReview
        ? `${appUrl}/videos?review=${videoId}`
        : `${appUrl}/videos/${videoId}`;
    return ((0, jsx_runtime_1.jsxs)(components_1.Html, { children: [(0, jsx_runtime_1.jsx)(components_1.Head, {}), (0, jsx_runtime_1.jsx)(components_1.Preview, { children: previewText }), (0, jsx_runtime_1.jsx)(components_1.Body, { style: bodyStyle, children: (0, jsx_runtime_1.jsxs)(components_1.Container, { style: containerStyle, children: [(0, jsx_runtime_1.jsx)(components_1.Section, { style: logoSectionStyle, children: (0, jsx_runtime_1.jsx)("table", { cellPadding: "0", cellSpacing: "0", role: "presentation", children: (0, jsx_runtime_1.jsx)("tbody", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { style: {
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
                                                    }, children: "AutoPost AI" }) })] }) }) }) }), (0, jsx_runtime_1.jsx)(components_1.Heading, { style: headingStyle, children: heading }), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: textStyle, children: ["Hi ", name, ","] }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: textStyle, children: body }), thumbnailUrl && ((0, jsx_runtime_1.jsx)(components_1.Section, { style: { textAlign: 'center', margin: '24px 0' }, children: (0, jsx_runtime_1.jsx)(components_1.Img, { src: thumbnailUrl, width: "280", height: "498", alt: videoTitle, style: {
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    maxWidth: '100%',
                                } }) })), (0, jsx_runtime_1.jsx)(components_1.Hr, { style: hrStyle }), (0, jsx_runtime_1.jsx)(components_1.Section, { style: { textAlign: 'center', marginTop: '32px' }, children: (0, jsx_runtime_1.jsx)(components_1.Link, { href: ctaHref, style: ctaButtonStyle, children: ctaText }) }), isReview && ((0, jsx_runtime_1.jsx)(components_1.Text, { style: hintTextStyle, children: "\u23F1 If you don't respond within 24 hours, this video will be handled by your autopilot settings." })), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: footerStyle, children: ["You're receiving this because you have video notifications enabled. Manage your notification preferences in", ' ', (0, jsx_runtime_1.jsx)(components_1.Link, { href: `${appUrl}/settings`, style: { color: '#0A84FF' }, children: "Settings" }), "."] })] }) })] }));
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
const hintTextStyle = {
    color: 'rgba(245, 245, 247, 0.35)',
    fontSize: '13px',
    lineHeight: 1.6,
    margin: '16px 0 0',
    textAlign: 'center',
};
const hrStyle = {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: '1px 0 0',
    margin: '24px 0',
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
async function sendVideoReadyEmail(params) {
    const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 'dummy_key');
    const subject = params.approvalMode === 'review'
        ? `Review required: ${params.videoTitle}`
        : `Video queued: ${params.videoTitle}`;
    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
        to: params.email,
        subject,
        react: VideoReadyEmail({
            name: params.name,
            videoTitle: params.videoTitle,
            videoId: params.videoId,
            thumbnailUrl: params.thumbnailUrl,
            approvalMode: params.approvalMode,
        }),
    });
}
