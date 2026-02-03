"use client";
import { useState } from "react";

export default function Home() {
  const [lPer100km, setLPer100km] = useState("");
  const [result, setResult] = useState(null);

  function convert() {
    const value = parseFloat(lPer100km);
    if (isNaN(value) || value <= 0) {
      setResult(null);
      return;
    }

    const mpgUK = 282.481 / value;
    const mpgUS = 235.215 / value;

    setResult({
      uk: mpgUK.toFixed(2),
      us: mpgUS.toFixed(2),
    });
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Fuel Consumption Converter</h1>

      <label>
        Litres per 100 km:
        <br />
        <input
          type="number"
          step="0.1"
          value={lPer100km}
          onChange={(e) => setLPer100km(e.target.value)}
          style={{ marginTop: "0.5rem", padding: "0.5rem" }}
        />
      </label>

      <br /><br />

      <button onClick={convert} style={{ padding: "0.5rem 1rem" }}>
        Convert
      </button>

      {result && (
        <div style={{ marginTop: "1.5rem" }}>
          <p><strong>UK MPG:</strong> {result.uk}</p>
          <p><strong>US MPG:</strong> {result.us}</p>
        </div>
      )}
    </main>
  );
}
