


/* ===============================
   AI CONFIG (INTERNAL USE ONLY)
================================ */
const OPENROUTER_API_KEY =
  "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";

/* ===============================
   AUTH CHECK (NORMAL LOGIN)
================================ */
const loggedUser = localStorage.getItem("loggedInUser");
if (!loggedUser) {
  window.location.href = "auth.html";
}

/* ===============================
   GENERATE RESUME
================================ */
async function generateResume() {
  const role = document.getElementById("role").value.trim();
  const name = document.getElementById("name").value.trim();
  const contact = document.getElementById("contact").value.trim();
  const education = getMultiValues("educationInput").join("\n");

  const experiences = getMultiValues("experienceInput").join("\n");
  const projects = getMultiValues("projectsInput").join("\n");
  const skills = document.getElementById("skills").value;
  
  

  if (!name || !role) {
    alert("Name and role are required");
    return;
  }

 
const prompt = `
You are a senior resume writer.

Your task is to write a PROFESSIONAL SUMMARY that is:
- grounded in the candidate's actual experience
- specific and evidence-based
- not generic

Rules for PROFESSIONAL SUMMARY:
- Do NOT use the word "summary"
- Do NOT say "experienced professional"
- Every sentence MUST reference at least one of:
  - a skill
  - an internship / company
  - a project task
- If data is missing, infer carefully from given inputs
- Write exactly 3–4 sentences

Then write:

EXPERIENCE SUMMARY
- bullets starting with "-"
- Write exactly 2-3 sentences 

PROJECTS SUMMARY
- bullets starting with "*"
- Write exactly 2–3 bullets
- EACH bullet MUST:
  - explicitly mention the project title
  - be based ONLY on the provided project input
  - NOT invent AI, ML, or unrelated technologies
  - describe features or functionality realistically
  

INPUT DATA:

SKILLS:
${skills}

EXPERIENCE:
${experiences}

PROJECTS:
${projects}

FORMAT RULES:
- Use section headers exactly:
  PROFESSIONAL SUMMARY
  EXPERIENCE SUMMARY
  PROJECTS SUMMARY
- No markdown
- No explanations
`;

  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OPENROUTER_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }]
        })
      }
    );

    const data = await res.json();

    if (!data.choices || !data.choices[0]) {
      throw new Error("AI response invalid");
    }

    const aiText = data.choices[0].message.content;
    renderResume(name, contact, education, skills, aiText);
  } catch (err) {
    console.error(err);
    alert("Resume generation failed");
  }
}

/* ===============================
   RENDER RESUME
================================ */
function renderResume(name, contact, education, skills, aiText) {
  const lines = aiText.split("\n").filter(l => l.trim());

  function extractSection(text, start, end) {
  const s = text.indexOf(start);
  if (s === -1) return "";

  const e = end ? text.indexOf(end, s + start.length) : text.length;
  return text
    .substring(s + start.length, e)
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .join(" ");
}

const summary = extractSection(
  aiText,
  "PROFESSIONAL SUMMARY",
  "EXPERIENCE SUMMARY"
  ,
);
  const experience = lines
    .filter(l => l.startsWith("-"))
    .map(l => `<li>${l.replace("-", "").trim()}</li>`)
    .join("");

  const projects = lines
    .filter(l => l.startsWith("*"))
    .map(l => `<li>${l.replace("*", "").trim()}</li>`)
    .join("");

  document.getElementById("resumePreview").innerHTML = `
    <h2 style="text-align:center">${name}</h2>
    <p style="text-align:center">${contact}</p>

    <h3>Professional Summary</h3>
    <p>${summary}</p>

    <h3>Experience</h3>
    <ul>${experience}</ul>

    <h3>Projects</h3>
    <ul>${projects}</ul>

    <h3>Education</h3>
<p>${education}</p>
    <h3>Skills</h3>
    <p>${skills}</p>
  `;
}
/* ===============================
   TEXT HELPERS
================================ */
function extractSummary(text) {
  return text
    .split("\n")
    .filter(line => line.trim() && !line.trim().startsWith("-"))
    .slice(0, 4)
    .join(" ");
}

function extractBullets(text) {
  const bullets = text
    .split("\n")
    .filter(line => line.trim().startsWith("-"));

  if (bullets.length === 0) {
    return "<li>No experience generated</li>";
  }

  return bullets
    .map(b => `<li>${b.replace(/^-\s*/, "")}</li>`)
    .join("");
}

/* ===============================
   ATS SCORE
================================ */
async function calculateATS() {
  const resumeText =
    document.getElementById("resumePreview").innerText;
  const jobDesc =
    document.getElementById("jobDescription").value.trim();

  if (!resumeText || resumeText.length < 100) {
    alert("Generate resume first");
    return;
  }

  if (!jobDesc) {
    alert("Paste job description");
    return;
  }

  const atsPrompt = `
Compare the RESUME with the JOB DESCRIPTION.

Return ONLY in this format:

ATS Score: <number>/100
Matched Keywords:
Missing Keywords:
Improvements:
- point 1
- point 2
- point 3

JOB DESCRIPTION:
${jobDesc}

RESUME:
${resumeText}
`;

  try {
    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OPENROUTER_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [{ role: "user", content: atsPrompt }]
        })
      }
    );

    const data = await res.json();

    if (!data.choices) {
      throw new Error("ATS failed");
    }

    document.getElementById("atsResult").innerText =
      data.choices[0].message.content;
  } catch (err) {
    console.error(err);
    alert("ATS analysis failed");
  }
}


/* ===== PDF DOWNLOAD ===== */
function downloadPDF() {
  const resume = document.getElementById("resumePreview");

  if (!resume || resume.innerText.trim() === "") {
    alert("Generate resume first");
    return;
  }

  const options = {
    margin: 0.5,
    filename: "AI_Resume.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
  };

  html2pdf().set(options).from(resume).save();
}
/* ================= LOCAL STORAGE ================= */

async function saveResumeToBackend(resumeData) {
  const res = await fetch("http://localhost:5000/api/resume/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resumeData)
  });

  const data = await res.json();
  if (data.success) {
    alert("Resume saved successfully");
  }
}

/* === Helpers === */
const getVal = id => document.getElementById(id)?.value || "";
const setVal = (id, val) => (document.getElementById(id).value = val || "");

function getMultiValues(className) {
  return [...document.getElementsByClassName(className)]
    .map(el => el.value)
    .filter(v => v.trim());
}

function loadMultiFields(className, values) {
  if (!values || !values.length) return;

  const container = document.getElementById(className + "Container");
  container.innerHTML = "";

  values.forEach(val => addField(className, val));
}
function addField(className, value = "") {
  const container = document.getElementById(className + "Container");

  const textarea = document.createElement("textarea");
  textarea.className = className;
  textarea.value = value;
  textarea.oninput = saveFormData;

  container.appendChild(textarea);
}
document
  .getElementById("generateBtn")
  .addEventListener("click", generateResume);
window.onload = loadFormData;

document.querySelectorAll("input, textarea").forEach(el => {
  el.addEventListener("input", saveFormData);
});
function openDialog(title, placeholder, onSave) {
  const dialog = document.createElement("div");
  dialog.className = "dialog-overlay";

  dialog.innerHTML = `
    <div class="dialog-box">
      <h3>${title}</h3>
      <textarea id="dialogInput" placeholder="${placeholder}" rows="6"></textarea>
      <div class="dialog-actions">
        <button id="saveDialog">Add</button>
        <button id="cancelDialog">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  document.getElementById("cancelDialog").onclick = () => dialog.remove();
  document.getElementById("saveDialog").onclick = () => {
    const value = document.getElementById("dialogInput").value.trim();
    if (value) onSave(value);
    dialog.remove();
  };
}
/* ===================job recommendations with adzuna app ===================== */
async function getJobRecommendations() {
  const role = document.getElementById("role").value;
  const skills = document.getElementById("skills").value;

  if (!role || !skills) {
    alert("Generate resume first");
    return;
  }

  document.getElementById("jobResults").innerHTML =
    "<p>Fetching real-time jobs...</p>";

  const APP_ID = "2fc00331";
  const API_KEY = "31f165c12bc27c3a8f9bc59e847436d6";

  const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${APP_ID}&app_key=${API_KEY}&results_per_page=5&what=${role}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      document.getElementById("jobResults").innerHTML =
        "<p>No jobs found</p>";
      return;
    }
    function filterValidJobs(jobs) {
  const today = new Date();
  const MAX_DAYS = 30;

  return jobs.filter(job => {
    if (job.status !== "open") return false;

    const posted = new Date(job.postedDate);
    const diffDays = (today - posted) / (1000 * 60 * 60 * 24);

    return diffDays <= MAX_DAYS;
  });
}


    let html = "";

    data.results.forEach(job => {
      html += `
        <div class="job-card">
          <h4>${job.title}</h4>
          <p><strong>Company:</strong> ${job.company.display_name}</p>
          <p><strong>Location:</strong> ${job.location.display_name}</p>
          <a href="${job.redirect_url}" target="_blank">
            Apply Now →
          </a>
        </div>
      `;
    });

    document.getElementById("jobResults").innerHTML = html;

  } catch (err) {
    document.getElementById("jobResults").innerHTML =
      "<p>Failed to load jobs</p>";
  }
}


function downloadResume() {
  const resume = document.getElementById("resumePreview");

  html2pdf()
    .from(resume)
    .save("AI_Resume.pdf");
}
const photoInput = document.getElementById("photo");
const previewPhoto = document.getElementById("previewPhoto");

photoInput.addEventListener("change", function () {
  const file = this.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    previewPhoto.src = e.target.result; // base64 image
    previewPhoto.style.display = "block";
  };

  reader.readAsDataURL(file);
});

html2pdf()
  .from(document.getElementById("resume"))
  .set({
    margin: 0.4,
    
    html2canvas: { scale: 2 },
    jsPDF: { format: "a4", unit: "in" }
  })
  .save();



