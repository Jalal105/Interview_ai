const PDFDocument = require("pdfkit");

/**
 * Generates an executive, ATS-compliant PDF from structured resume data.
 * @param {Object} structuredResume - The structured resume JSON
 * @param {string} [themeColor="#ff2d78"] - Hex accent color for headers and styling
 * @returns {Promise<Buffer>} - Resolves to the binary PDF buffer
 */
function generateResumePdfBuffer(structuredResume, themeColor = "#ff2d78") {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "LETTER",
                margins: { top: 40, bottom: 40, left: 40, right: 40 },
                autoFirstPage: true
            });

            const chunks = [];
            doc.on("data", chunk => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);

            const contentWidth = 532; // 612 - 40 - 40
            const leftMargin = 40;
            const rightEdge = leftMargin + contentWidth;

            // Safe fallback defaults
            const info = structuredResume.personalInfo || {};
            const name = (info.fullName || "Candidate Name").trim();
            const title = (info.title || "Target Professional").trim();
            const summary = (structuredResume.summary || "").trim();
            const skills = structuredResume.skills || [];
            const experience = structuredResume.experience || [];
            const projects = structuredResume.projects || [];
            const education = structuredResume.education || [];

            // Color Palette
            const primaryColor = themeColor || "#ff2d78";
            const textDark = "#0f172a"; // slate-900
            const textBody = "#334155"; // slate-700
            const textMuted = "#64748b"; // slate-500
            const borderMuted = "#e2e8f0"; // slate-200

            // Helper to render section headings
            const renderSectionHeader = (titleText) => {
                doc.moveDown(0.7);
                doc.font("Helvetica-Bold").fontSize(10.5).fillColor(textDark)
                    .text(titleText.toUpperCase(), leftMargin, doc.y, { letterSpacing: 0.5 });
                doc.moveDown(0.2);
                doc.strokeColor(primaryColor).lineWidth(1)
                    .moveTo(leftMargin, doc.y).lineTo(rightEdge, doc.y).stroke();
                doc.moveDown(0.4);
            };

            // ── Header Section ──────────────────────────────────────────────
            doc.font("Helvetica-Bold").fontSize(20).fillColor(textDark)
                .text(name, leftMargin, doc.y, { align: "center", width: contentWidth });

            doc.moveDown(0.15);
            doc.font("Helvetica-Bold").fontSize(10.5).fillColor(primaryColor)
                .text(title.toUpperCase(), leftMargin, doc.y, { align: "center", width: contentWidth });

            // Contact Info Bar
            const contactParts = [];
            if (info.email) contactParts.push(info.email);
            if (info.phone) contactParts.push(info.phone);
            if (info.location) contactParts.push(info.location);
            if (info.linkedin) contactParts.push(info.linkedin.replace(/^https?:\/\/(www\.)?/, ''));
            if (info.github) contactParts.push(info.github.replace(/^https?:\/\/(www\.)?/, ''));

            if (contactParts.length > 0) {
                doc.moveDown(0.25);
                doc.font("Helvetica").fontSize(8.5).fillColor(textMuted)
                    .text(contactParts.join("  |  "), leftMargin, doc.y, { align: "center", width: contentWidth });
            }

            doc.moveDown(0.5);
            doc.strokeColor(borderMuted).lineWidth(0.5)
                .moveTo(leftMargin, doc.y).lineTo(rightEdge, doc.y).stroke();

            // ── Professional Summary ─────────────────────────────────────────
            if (summary) {
                renderSectionHeader("Professional Summary");
                doc.font("Helvetica").fontSize(9.2).fillColor(textBody).lineGap(2.5)
                    .text(summary, leftMargin, doc.y, { width: contentWidth, align: "left" });
            }

            // ── Technical & Core Skills ──────────────────────────────────────
            if (skills.length > 0) {
                renderSectionHeader("Core Competencies & Technical Skills");
                skills.forEach(skillGroup => {
                    if (typeof skillGroup === "string") {
                        doc.font("Helvetica").fontSize(9).fillColor(textBody).text(`• ${skillGroup}`);
                        doc.moveDown(0.15);
                        return;
                    }
                    const category = skillGroup.category || "Skills";
                    const items = Array.isArray(skillGroup.items)
                        ? skillGroup.items.join(", ")
                        : (typeof skillGroup.items === "string" ? skillGroup.items : "");
                    if (items) {
                        const startY = doc.y;
                        doc.font("Helvetica-Bold").fontSize(9).fillColor(textDark)
                            .text(`${category}: `, leftMargin, startY, { continued: true });
                        doc.font("Helvetica").fontSize(9).fillColor(textBody)
                            .text(items);
                        doc.moveDown(0.2);
                    }
                });
            }

            // ── Professional Experience ──────────────────────────────────────
            if (experience.length > 0) {
                renderSectionHeader("Professional Experience");

                experience.forEach((job, idx) => {
                    if (idx > 0) doc.moveDown(0.5);

                    // Row 1: Role (left) & Dates (right)
                    const roleY = doc.y;
                    doc.font("Helvetica-Bold").fontSize(10).fillColor(textDark)
                        .text(job.role || "Role Title", leftMargin, roleY, { width: contentWidth * 0.7 });

                    const dateStr = [job.startDate, job.endDate].filter(Boolean).join(" – ") || "";
                    if (dateStr) {
                        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(textMuted)
                            .text(dateStr, leftMargin, roleY, { align: "right", width: contentWidth });
                    }

                    // Row 2: Company & Location
                    const subParts = [job.company, job.location].filter(Boolean);
                    if (subParts.length > 0) {
                        doc.font("Helvetica-Oblique").fontSize(9).fillColor(primaryColor)
                            .text(subParts.join("  •  "), leftMargin, doc.y);
                    }

                    doc.moveDown(0.25);

                    // Bullet Points
                    const highlights = Array.isArray(job.highlights)
                        ? job.highlights
                        : (Array.isArray(job.description) ? job.description : (typeof job.highlights === "string" ? [job.highlights] : []));
                    highlights.forEach(bullet => {
                        const cleanBullet = String(bullet || "").replace(/^[\s•*-]+/, '').trim();
                        if (cleanBullet) {
                            const bulletY = doc.y;
                            doc.font("Helvetica").fontSize(9).fillColor(primaryColor)
                                .text("•", leftMargin + 6, bulletY, { width: 10 });
                            doc.font("Helvetica").fontSize(8.8).fillColor(textBody).lineGap(2)
                                .text(cleanBullet, leftMargin + 18, bulletY, { width: contentWidth - 18 });
                            doc.moveDown(0.15);
                        }
                    });
                });
            }

            // ── Featured Projects ───────────────────────────────────────────
            if (projects.length > 0) {
                renderSectionHeader("Featured Projects");

                projects.forEach((proj, idx) => {
                    if (idx > 0) doc.moveDown(0.4);

                    const techList = Array.isArray(proj.technologies)
                        ? proj.technologies.filter(Boolean)
                        : (typeof proj.technologies === "string" && proj.technologies.trim().length > 0
                            ? proj.technologies.split(",").map(t => t.trim()).filter(Boolean)
                            : []);

                    const titleY = doc.y;
                    doc.font("Helvetica-Bold").fontSize(9.8).fillColor(textDark)
                        .text(proj.title || "Project", leftMargin, titleY, { continued: techList.length > 0 });

                    if (techList.length > 0) {
                        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(primaryColor)
                            .text(`  [${techList.join(", ")}]`);
                    }

                    doc.moveDown(0.2);

                    const descBullets = Array.isArray(proj.description)
                        ? proj.description
                        : (typeof proj.description === "string" ? [proj.description] : []);
                    descBullets.forEach(bullet => {
                        const cleanBullet = String(bullet || "").replace(/^[\s•*-]+/, '').trim();
                        if (cleanBullet) {
                            const bulletY = doc.y;
                            doc.font("Helvetica").fontSize(9).fillColor(primaryColor)
                                .text("•", leftMargin + 6, bulletY, { width: 10 });
                            doc.font("Helvetica").fontSize(8.8).fillColor(textBody).lineGap(2)
                                .text(cleanBullet, leftMargin + 18, bulletY, { width: contentWidth - 18 });
                            doc.moveDown(0.15);
                        }
                    });
                });
            }

            // ── Education ───────────────────────────────────────────────────
            if (education.length > 0) {
                renderSectionHeader("Education");

                education.forEach((edu, idx) => {
                    if (idx > 0) doc.moveDown(0.3);

                    const eduY = doc.y;
                    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(textDark)
                        .text(edu.degree || "Degree", leftMargin, eduY, { width: contentWidth * 0.75 });

                    if (edu.graduationDate) {
                        doc.font("Helvetica").fontSize(8.5).fillColor(textMuted)
                            .text(edu.graduationDate, leftMargin, eduY, { align: "right", width: contentWidth });
                    }

                    const eduSub = [edu.institution, edu.location].filter(Boolean);
                    if (eduSub.length > 0) {
                        doc.font("Helvetica").fontSize(9).fillColor(textBody)
                            .text(eduSub.join(", "), leftMargin, doc.y);
                    }
                });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateResumePdfBuffer };
