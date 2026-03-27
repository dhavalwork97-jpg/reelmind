import React, { useState } from "react";
import UploadPage from "./pages/UploadPage";
import TemplatePage from "./pages/TemplatePage";
import MusicPage from "./pages/MusicPage";
import ExportPage from "./pages/ExportPage";
import "./App.css";

const STEPS = ["Upload", "Template", "Music", "Export"];

export default function App() {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState(null); // holds all video + analysis data
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [outputName, setOutputName] = useState(null);

  const goTo = (n) => setStep(n);

  const handleUploadDone = (data) => {
    setProject(data);
    setSelectedTemplate(data.analysis.recommendedTemplate);
    goTo(1);
  };

  const handleTemplateDone = (template) => {
    setSelectedTemplate(template);
    goTo(2);
  };

  const handleMusicDone = (music) => {
    setSelectedMusic(music);
    goTo(3);
  };

  const handleProcessDone = (name) => {
    setOutputName(name);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">Reel<span>Mind</span></div>
        <nav className="steps-nav">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`step-pill ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              onClick={() => i < step && goTo(i)}
            >
              <span className="step-dot">{i < step ? "✓" : i + 1}</span>
              <span className="step-name">{s}</span>
            </div>
          ))}
        </nav>
        <div className="header-badge">✦ AI Powered</div>
      </header>

      <main className="app-main">
        {step === 0 && <UploadPage onDone={handleUploadDone} />}
        {step === 1 && project && (
          <TemplatePage
            project={project}
            initial={selectedTemplate}
            onDone={handleTemplateDone}
            onBack={() => goTo(0)}
          />
        )}
        {step === 2 && project && (
          <MusicPage
            project={project}
            template={selectedTemplate}
            onDone={handleMusicDone}
            onBack={() => goTo(1)}
          />
        )}
        {step === 3 && project && (
          <ExportPage
            project={project}
            template={selectedTemplate}
            music={selectedMusic}
            outputName={outputName}
            onProcessDone={handleProcessDone}
            onBack={() => goTo(2)}
            onReset={() => { setProject(null); setStep(0); setOutputName(null); }}
          />
        )}
      </main>
    </div>
  );
}
