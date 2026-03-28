import React, { useState } from "react";
import UploadPage from "./pages/UploadPage";
import TemplatePage from "./pages/TemplatePage";
import MusicPage from "./pages/MusicPage";
import ExportPage from "./pages/ExportPage";
import "./App.css";

const STEPS = ["Upload", "Template", "Music", "Export"];

export default function App() {
  const [step, setStep]               = useState(0);
  const [project, setProject]         = useState(null);
  const [template, setTemplate]       = useState(null);
  const [exportFormat, setExportFormat] = useState("instagram");
  const [music, setMusic]             = useState(null);

  const reset = () => { setProject(null); setStep(0); setTemplate(null); setMusic(null); setExportFormat("instagram"); };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">Reel<span>Mind</span></div>
        <nav className="steps-nav">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`step-pill ${i===step?"active":""} ${i<step?"done":""}`}
              onClick={() => i < step && setStep(i)}
            >
              <span className="step-dot">{i < step ? "✓" : i+1}</span>
              <span className="step-name">{s}</span>
            </div>
          ))}
        </nav>
        <div className="header-badge">✦ AI Powered</div>
      </header>

      <main className="app-main">
        {step === 0 && (
          <UploadPage onDone={(data) => { setProject(data); setTemplate(data.analysis.recommendedTemplate); setStep(1); }} />
        )}
        {step === 1 && project && (
          <TemplatePage
            project={project}
            initial={template}
            onDone={({ template: t, exportFormat: f }) => { setTemplate(t); setExportFormat(f); setStep(2); }}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && project && (
          <MusicPage
            project={project}
            onDone={(m) => { setMusic(m); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && project && (
          <ExportPage
            project={project}
            template={template}
            exportFormat={exportFormat}
            music={music}
            onBack={() => setStep(2)}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}
