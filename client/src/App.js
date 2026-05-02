import { useState, useRef } from "react";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const cvTextRef = useRef("");

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item) => item.str).join(" ");
      }
      cvTextRef.current = text;
      console.log("CV text loaded, length:", text.length);
    } catch (err) {
      setError("Failed to read PDF. Please try another file.");
    }
  };

  const handleSubmit = async () => {
    const currentCvText = cvTextRef.current;

    if (!currentCvText) {
      setError("Please upload your CV");
      return;
    }
    if (!jobDescription || !company || !role) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('https://internship-assistant-production.up.railway.app/api/analyse', {
        cvText: currentCvText,
        jobDescription,
        company,
        role,
      });
      setResult(response.data);
    } catch (err) {
      setError(
        "Something went wrong. Make sure your server is running on port 5000."
      );
    }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBg = (score) => {
    if (score >= 75) return "bg-green-50 border-green-200";
    if (score >= 50) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Internship Assistant
          </h1>
          <p className="text-gray-500">
            Upload your CV and a job description to get your fit score, skill
            gaps, and a tailored cover letter.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Your CV
          </label>
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <span className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              Choose PDF
            </span>
            <span className="text-sm text-gray-400">
              {fileName || "No file chosen"}
            </span>
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />
          </label>
          {fileName && (
            <p className="text-green-600 text-sm mt-3">
              ✓ {fileName} loaded successfully
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Job Details
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. WSO2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Software Engineering Intern"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <label className="block text-xs text-gray-500 mb-1">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={7}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Analysing your application...
            </span>
          ) : (
            "Analyse My Application"
          )}
        </button>

        {result && (
          <div className="mt-8 space-y-4">
            <div
              className={`rounded-2xl p-6 border ${getScoreBg(
                result.fitScore
              )}`}
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Fit Score
              </h2>
              <div className="flex items-center gap-4">
                <span
                  className={`text-6xl font-bold ${getScoreColor(
                    result.fitScore
                  )}`}
                >
                  {result.fitScore}%
                </span>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {result.fitReason}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Skill Gaps
              </h2>
              {result.skillGaps.length === 0 ? (
                <p className="text-green-600 text-sm">
                  No major skill gaps found!
                </p>
              ) : (
                <div className="space-y-3">
                  {result.skillGaps.map((gap, i) => (
                    <div
                      key={i}
                      className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition"
                    >
                      <p className="font-semibold text-gray-800 text-sm mb-1">
                        {gap.skill}
                      </p>
                      <p className="text-gray-500 text-sm">{gap.advice}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Cover Letter
                </h2>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(result.coverLetter)
                  }
                  className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition font-medium"
                >
                  Copy
                </button>
              </div>
              <textarea
                value={result.coverLetter}
                onChange={(e) =>
                  setResult({ ...result, coverLetter: e.target.value })
                }
                rows={14}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
