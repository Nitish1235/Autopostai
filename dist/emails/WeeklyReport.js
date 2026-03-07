"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeeklyReportEmail = WeeklyReportEmail;
exports.sendWeeklyReportEmail = sendWeeklyReportEmail;
const jsx_runtime_1 = require("react/jsx-runtime");
const components_1 = require("@react-email/components");
const resend_1 = require("resend");
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com';
// ── Email Template ────────────────────────────────────
function WeeklyReportEmail({ name, weekStartDate, totalViews, videosPosted, topVideoTitle, topVideoViews, followerGrowth, creditsRemaining, }) {
    return ((0, jsx_runtime_1.jsxs)(components_1.Html, { children: [(0, jsx_runtime_1.jsx)(components_1.Head, {}), (0, jsx_runtime_1.jsxs)(components_1.Preview, { children: ["Your week in numbers \u2014 ", totalViews.toLocaleString(), " views"] }), (0, jsx_runtime_1.jsx)(components_1.Body, { style: bodyStyle, children: (0, jsx_runtime_1.jsxs)(components_1.Container, { style: containerStyle, children: [(0, jsx_runtime_1.jsx)(components_1.Section, { style: logoSectionStyle, children: (0, jsx_runtime_1.jsx)("table", { cellPadding: "0", cellSpacing: "0", role: "presentation", children: (0, jsx_runtime_1.jsx)("tbody", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { style: {
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
                                                    }, children: "AutoPost AI" }) })] }) }) }) }), (0, jsx_runtime_1.jsxs)(components_1.Heading, { style: headingStyle, children: ["Your weekly report \u2014 week of ", weekStartDate] }), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: textStyle, children: ["Hey ", name, ", here's how your channels performed:"] }), (0, jsx_runtime_1.jsx)(components_1.Hr, { style: hrStyle }), (0, jsx_runtime_1.jsx)("table", { cellPadding: "0", cellSpacing: "0", role: "presentation", width: "100%", style: { marginBottom: '24px' }, children: (0, jsx_runtime_1.jsxs)("tbody", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { style: statBoxStyle, align: "center", children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: statValueStyle, children: totalViews.toLocaleString() }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: statLabelStyle, children: "Total Views" })] }), (0, jsx_runtime_1.jsx)("td", { width: "12" }), (0, jsx_runtime_1.jsxs)("td", { style: statBoxStyle, align: "center", children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: statValueStyle, children: videosPosted }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: statLabelStyle, children: "Videos Posted" })] })] }), (0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { height: "12", colSpan: 3 }) }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { style: statBoxStyle, align: "center", children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: statValueStyle, children: topVideoViews.toLocaleString() }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: statLabelStyle, children: "Top Video Views" })] }), (0, jsx_runtime_1.jsx)("td", { width: "12" }), (0, jsx_runtime_1.jsxs)("td", { style: statBoxStyle, align: "center", children: [(0, jsx_runtime_1.jsxs)(components_1.Text, { style: statValueStyle, children: [followerGrowth >= 0 ? '+' : '', followerGrowth.toLocaleString()] }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: statLabelStyle, children: "Followers Gained" })] })] })] }) }), (0, jsx_runtime_1.jsxs)(components_1.Section, { style: topVideoSectionStyle, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: sectionTitleStyle, children: "\uD83C\uDFC6 Top Video This Week" }), (0, jsx_runtime_1.jsx)(components_1.Text, { style: {
                                        ...textStyle,
                                        color: '#F5F5F7',
                                        fontWeight: 600,
                                        fontSize: '16px',
                                        margin: '4px 0',
                                    }, children: topVideoTitle }), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: textStyle, children: [topVideoViews.toLocaleString(), " views"] })] }), (0, jsx_runtime_1.jsx)(components_1.Hr, { style: hrStyle }), (0, jsx_runtime_1.jsxs)(components_1.Section, { style: { textAlign: 'center', marginBottom: '24px' }, children: [(0, jsx_runtime_1.jsx)(components_1.Text, { style: sectionTitleStyle, children: "Credits Remaining" }), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: {
                                        ...statValueStyle,
                                        color: creditsRemaining < 10 ? '#FF453A' : '#30D158',
                                        display: 'inline-block',
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        backgroundColor: creditsRemaining < 10
                                            ? 'rgba(255, 69, 58, 0.12)'
                                            : 'rgba(48, 209, 88, 0.12)',
                                        border: `1px solid ${creditsRemaining < 10
                                            ? 'rgba(255, 69, 58, 0.25)'
                                            : 'rgba(48, 209, 88, 0.25)'}`,
                                    }, children: [creditsRemaining, " videos"] }), creditsRemaining < 10 && ((0, jsx_runtime_1.jsx)(components_1.Text, { style: { ...hintTextStyle, marginTop: '8px' }, children: "Running low! Top up to keep your channels active." }))] }), (0, jsx_runtime_1.jsx)(components_1.Hr, { style: hrStyle }), (0, jsx_runtime_1.jsx)(components_1.Section, { style: { textAlign: 'center', marginTop: '32px' }, children: (0, jsx_runtime_1.jsx)(components_1.Link, { href: `${appUrl}/analytics`, style: ctaButtonStyle, children: "View Full Analytics \u2192" }) }), (0, jsx_runtime_1.jsxs)(components_1.Text, { style: footerStyle, children: ["AutoPost AI ran your channel on autopilot this week. Manage notification preferences in", ' ', (0, jsx_runtime_1.jsx)(components_1.Link, { href: `${appUrl}/settings`, style: { color: '#0A84FF' }, children: "Settings" }), "."] })] }) })] }));
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
    fontSize: '22px',
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
    margin: 0,
};
const hrStyle = {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: '1px 0 0',
    margin: '24px 0',
};
const statBoxStyle = {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '16px 12px',
};
const statValueStyle = {
    color: '#F5F5F7',
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: 1,
    margin: '0 0 4px',
};
const statLabelStyle = {
    color: 'rgba(245, 245, 247, 0.4)',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};
const sectionTitleStyle = {
    color: 'rgba(245, 245, 247, 0.4)',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px',
};
const topVideoSectionStyle = {
    backgroundColor: 'rgba(10, 132, 255, 0.06)',
    border: '1px solid rgba(10, 132, 255, 0.15)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '8px',
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
async function sendWeeklyReportEmail(params) {
    const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 'dummy_key');
    await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
        to: params.email,
        subject: `Your week in numbers — ${params.totalViews.toLocaleString()} views`,
        react: WeeklyReportEmail({
            name: params.name,
            weekStartDate: params.weekStartDate,
            totalViews: params.totalViews,
            videosPosted: params.videosPosted,
            topVideoTitle: params.topVideoTitle,
            topVideoViews: params.topVideoViews,
            followerGrowth: params.followerGrowth,
            creditsRemaining: params.creditsRemaining,
        }),
    });
}
