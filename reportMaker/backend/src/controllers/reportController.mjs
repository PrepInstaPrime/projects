import reportModel from "../models/reportModel.mjs";
import puppeteer from "puppeteer-core";
import fs from "node:fs";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function reportPdfHtml(report) {
    const title = (report.taskTitle && String(report.taskTitle).trim()) || "Report";
    const propertyType = report.propertyType || "—";
    const address = (report.address || "").trim() || "—";
    const description = (report.description || "").trim();
    const images = Array.isArray(report.images) ? report.images : [];
    const assignedTo = report.assignedTo || "—";
    const createdAt = report.createdAt ? new Date(report.createdAt).toLocaleString() : "—";
    const updatedAt = report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "—";
    const adminInstructions = (report.adminInstructions || "").trim();

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      html, body { padding: 0; margin: 0; }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        color: #0f172a;
        line-height: 1.35;
        font-size: 12px;
      }
      .brand { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #64748b; }
      h1 { font-size: 22px; margin: 6px 0 10px; }
      h2 { font-size: 13px; margin: 18px 0 8px; }
      .metaGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
      .pair { display: grid; grid-template-columns: 140px 1fr; gap: 10px; }
      .k { color: #64748b; }
      .v { color: #0f172a; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
        background: #fff;
        break-inside: avoid;
      }
      .callout {
        border-left: 4px solid #2563eb;
        background: #eff6ff;
        padding: 10px 12px;
        border-radius: 8px;
      }
      .p { margin: 0; white-space: pre-wrap; }
      .images { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .imgWrap { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px; break-inside: avoid; }
      img { width: 100%; height: auto; display: block; border-radius: 8px; }
      .footer { margin-top: 18px; color: #64748b; font-size: 11px; }
      .hr { height: 1px; background: #e2e8f0; margin: 14px 0; }
      @media print {
        a { color: inherit; text-decoration: none; }
      }
    </style>
  </head>
  <body>
    <div class="brand">ReportMaker</div>
    <h1>${escapeHtml(title)}</h1>

    <div class="card">
      <h2>Overview & metadata</h2>
      <div class="metaGrid">
        <div class="pair"><div class="k">Report ID</div><div class="v mono">${escapeHtml(report._id)}</div></div>
        <div class="pair"><div class="k">Assigned to (role)</div><div class="v">${escapeHtml(assignedTo)}</div></div>
        <div class="pair"><div class="k">Property type</div><div class="v">${escapeHtml(propertyType)}</div></div>
        <div class="pair"><div class="k">Created</div><div class="v">${escapeHtml(createdAt)}</div></div>
        <div class="pair" style="grid-column: 1 / -1;"><div class="k">Address</div><div class="v">${escapeHtml(address)}</div></div>
        <div class="pair"><div class="k">Last updated</div><div class="v">${escapeHtml(updatedAt)}</div></div>
      </div>
    </div>

    ${adminInstructions ? `
      <div style="margin-top: 12px" class="callout">
        <h2 style="margin-top:0">Admin instructions</h2>
        <p class="p">${escapeHtml(adminInstructions)}</p>
      </div>
    ` : ""}

    <div class="hr"></div>

    <div class="card">
      <h2>Report description</h2>
      ${description ? `<p class="p">${escapeHtml(description)}</p>` : `<p class="p" style="color:#64748b">No description yet.</p>`}
    </div>

    <div style="margin-top: 12px" class="card">
      <h2>Images</h2>
      ${images.length ? `
        <div class="images">
          ${images.map((src) => `
            <div class="imgWrap">
              <img src="${escapeHtml(src)}" alt="Report image" />
              <div class="footer mono" style="margin-top:6px">${escapeHtml(src)}</div>
            </div>
          `).join("")}
        </div>
      ` : `<p class="p" style="color:#64748b">No images.</p>`}
    </div>

    <div class="footer">Generated ${escapeHtml(new Date().toLocaleString())}</div>
  </body>
</html>`;
}

function pdfHeaderTemplate({ title, reportId }) {
    const safeTitle = escapeHtml(title);
    const safeId = escapeHtml(reportId);
    // Chrome header/footer HTML is its own document; keep styling inline and simple.
    return `
      <div style="width: 100%; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 9px; color: #64748b; padding: 0 14mm;">
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="letter-spacing: .12em; text-transform: uppercase;">ReportMaker</div>
          <div style="max-width: 60%; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; color:#0f172a;">
            ${safeTitle}
          </div>
          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
            ${safeId}
          </div>
        </div>
        <div style="height:1px; background:#e2e8f0; margin-top:6px;"></div>
      </div>
    `;
}

function pdfFooterTemplate({ generatedAt }) {
    const safeGeneratedAt = escapeHtml(generatedAt);
    return `
      <div style="width: 100%; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 9px; color: #64748b; padding: 0 14mm;">
        <div style="height:1px; background:#e2e8f0; margin-bottom:6px;"></div>
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div>Generated ${safeGeneratedAt}</div>
          <div>
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        </div>
      </div>
    `;
}

function pickChromeExecutable() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
    const candidates = [
        // macOS
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        // linux (common)
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        // windows (best-effort; for deployments adjust CHROME_PATH)
        "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
        "C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe",
        "C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
        "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe",
    ];
    return candidates.find((p) => (p ? fs.existsSync(p) : false)) || null;
}

const getReportPdf = async (req, res) => {
    let browser = null;
    try {
        const { reportId } = req.params;
        const report = await reportModel.findById(reportId);
        if (!report) {
            return res.status(404).send({ message: "Report not found" });
        }

        const role = req.user.role;
        const userId = req.user.userId;
        const canView =
            role === "admin" ||
            report.assignedTo === role ||
            String(report.userId) === String(userId);

        if (!canView) {
            return res.status(403).send({ message: "Forbidden" });
        }

        const html = reportPdfHtml(report);
        const title = (report.taskTitle && String(report.taskTitle).trim()) || "Report";
        const generatedAt = new Date().toLocaleString();

        const executablePath = pickChromeExecutable();
        if (!executablePath) {
            return res.status(500).send({
                message:
                    "Chrome executable not found. Set CHROME_PATH on the server to a Chrome/Chromium executable.",
            });
        }

        browser = await puppeteer.launch({
            headless: "new",
            executablePath,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: ["load", "networkidle0"] });

        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            // Leave space so header/footer don't overlap content
            margin: { top: "24mm", bottom: "20mm", left: "14mm", right: "14mm" },
            headerTemplate: pdfHeaderTemplate({ title, reportId: report._id }),
            footerTemplate: pdfFooterTemplate({ generatedAt }),
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="report-${escapeHtml(reportId)}.pdf"`);
        return res.status(200).send(pdf);
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: "Could not generate PDF" });
    } finally {
        if (browser) {
            try { await browser.close(); } catch { /* ignore */ }
        }
    }
};
const createReport = async (req, res) => {
    try {
        const { taskTitle, adminInstructions, propertyType, address, assignedTo } = req.body;
        const { userId } = req.user;
        if (!assignedTo) {
            return res.status(400).send({ message: "assignedTo is required" });
        }
        const report = await reportModel.create({
            userId,
            taskTitle: (taskTitle && String(taskTitle).trim()) || "Untitled task",
            adminInstructions: adminInstructions != null ? String(adminInstructions).trim() : "",
            propertyType: propertyType || "other",
            address: (address && String(address).trim()) || "To be confirmed on site",
            description: "",
            images: [],
            assignedTo,
        });
        return res.status(201).send({ message: "Report task created successfully", report });
    } catch (error) {
        if (error.message.includes("validation")) {
            return res.status(400).send({ message: "Validation failed", error: error.message });
        } else {
            return res.status(500).send({ message: "Internal server error" });
        }
    }
};
const getReports = async (req, res) => {
    try {
        let role = req.user.role;
        let reports = null;
        if (role === 'admin') {
            reports = await reportModel.find();
        } else {
            reports = await reportModel.find({ assignedTo: role });
        }
        return res.status(200).send({ message: "Reports found", reports });
    } catch (error) {
        return res.status(500).send({ message: "Internal server error" });
    }
};
const getMyCreatedReports = async (req, res) => {
    try {
        const { userId } = req.user;
        const reports = await reportModel.find({ userId }).sort({ updatedAt: -1 });
        return res.status(200).send({ message: "Reports found", reports });
    } catch (error) {
        return res.status(500).send({ message: "Internal server error" });
    }
};
const updateReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { propertyType, address, description, images } = req.body;
        const existing = await reportModel.findById(reportId);
        if (!existing) {
            return res.status(400).send({ message: "Report not found" });
        }
        const role = req.user.role;
        const canEdit =
            role === "admin" || existing.assignedTo === role;
        if (!canEdit) {
            return res.status(403).send({ message: "You can only update reports assigned to your role" });
        }
        let imageList = existing.images;
        if (images !== undefined) {
            imageList = Array.isArray(images)
                ? images.map((u) => String(u).trim()).filter(Boolean)
                : [];
        }
        const report = await reportModel.findByIdAndUpdate(
            reportId,
            {
                propertyType,
                address,
                description,
                images: imageList,
                updated: true,
                updatedBy: req.user.userId,
            },
            { new: true }
        );
        return res.status(200).send({ message: "Report updated successfully", report });
    } catch (error) {
        if (error.message.includes("report not found")) {
            return res.status(400).send({ message: "Report not found" });
        } else if (error.message.includes("validation")) {
            return res.status(400).send({ message: "Validation failed", error: error.message });
        } else {
            return res.status(500).send({ message: "Internal server error" });
        }
    }
};
export { createReport, getReports, getMyCreatedReports, updateReport };
export { getReportPdf };